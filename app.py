from __future__ import annotations

import os
import threading
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional

from flask import Flask, jsonify, render_template, request
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

try:
    import RPi.GPIO as GPIO  # type: ignore
    ON_PI = True
except Exception:
    GPIO = None  # type: ignore
    ON_PI = False

from storage import (
    load_schedules,
    save_schedules_atomically,
    load_zones,
    save_zones_atomically,
)


app = Flask(__name__, static_folder="static", template_folder="templates")


class PinController:
    """Controls a GPIO pin on Raspberry Pi or a mock when running locally."""

    def __init__(self, pin_number: int) -> None:
        self.pin_number = pin_number
        self._pin_state = False
        self._lock = threading.Lock()
        if ON_PI:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(self.pin_number, GPIO.OUT)

    @property
    def pin_state(self) -> bool:
        return self._pin_state

    def _set_state(self, state: bool) -> None:
        with self._lock:
            self._pin_state = state
            if ON_PI:
                GPIO.output(self.pin_number, GPIO.HIGH if state else GPIO.LOW)

    def activate_for(self, duration_seconds: int) -> None:
        duration_seconds = max(1, min(300, int(duration_seconds)))
        self._set_state(True)

        def _deactivate_later() -> None:
            time.sleep(duration_seconds)
            self._set_state(False)

        threading.Thread(target=_deactivate_later, daemon=True).start()


# Setup logging
def _setup_logging():
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Disable Flask and Werkzeug logging
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    logging.getLogger('flask').setLevel(logging.ERROR)
    
    # Configure our custom logging
    logger = logging.getLogger('aeroponics')
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers to avoid duplicates
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create file handler
    file_handler = logging.FileHandler('logs/aeroponics.log')
    file_handler.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(file_handler)
    
    return logger

logger = _setup_logging()

# Globals
_scheduler = BackgroundScheduler(daemon=True)
schedule_items: List[Dict] = []
zones: List[Dict] = []
zone_controllers: Dict[int, PinController] = {}


# Helpers

def _job_id(schedule_id: int) -> str:
    return f"schedule_{schedule_id}"


def _get_controller_for_zone(zone_id: int) -> Optional[PinController]:
    return zone_controllers.get(zone_id)


def _run_watering(zone_id: int, duration_seconds: int) -> None:
    controller = _get_controller_for_zone(zone_id)
    if controller is None:
        return
    
    # Get zone name for logging
    zone_name = next((z["name"] for z in zones if z["id"] == zone_id), f"Zone {zone_id}")
    
    # Log watering start
    logger.info(f"💧 WATERING STARTED: {zone_name} (GPIO {controller.pin_number}) for {duration_seconds} seconds")
    controller.activate_for(duration_seconds)
    
    # Log completion
    def _log_completion():
        time.sleep(duration_seconds)
        logger.info(f"✅ WATERING COMPLETED: {zone_name} (GPIO {controller.pin_number}) - {duration_seconds}s duration")
    
    threading.Thread(target=_log_completion, daemon=True).start()


def _reschedule_all_jobs() -> None:
    # Remove all existing jobs
    for job in list(_scheduler.get_jobs()):
        job.remove()

    # Add jobs for enabled schedules
    for s in schedule_items:
        if s.get("enabled"):
            _scheduler.add_job(
                _run_watering,
                IntervalTrigger(minutes=int(s["interval_minutes"])),
                id=_job_id(s["id"]),
                replace_existing=True,
                kwargs={
                    "zone_id": int(s["zone_id"]),
                    "duration_seconds": int(s["duration_seconds"]),
                },
            )


def _ensure_zone_controllers() -> None:
    global zone_controllers
    zone_controllers = {int(z["id"]): PinController(int(z["gpio_pin"])) for z in zones}


def _ensure_gpio17_zone() -> int:
    """Ensure there is a zone mapped to GPIO 17; return its zone id."""
    global zones
    for z in zones:
        if int(z.get("gpio_pin", -1)) == 17:
            return int(z["id"])
    new_id = (max([int(z["id"]) for z in zones]) + 1) if zones else 1
    new_zone = {"id": new_id, "name": "GPIO 17", "gpio_pin": 17, "voltage": "3.3V"}
    zones.append(new_zone)
    save_zones_atomically(zones)
    return new_id


def _load_on_startup() -> None:
    global schedule_items, zones
    
    zones = load_zones()
    if not zones:
        # Initialize default with GPIO 17 only
        zones = [
            {"id": 1, "name": "GPIO 17", "gpio_pin": 17, "voltage": "3.3V"},
        ]
        save_zones_atomically(zones)
    
    gpio17_zone_id = _ensure_gpio17_zone()
    _ensure_zone_controllers()

    schedule_items = load_schedules()
    # Migrate schedules without zone_id to GPIO 17 zone
    if any("zone_id" not in s for s in schedule_items):
        for s in schedule_items:
            s.setdefault("zone_id", gpio17_zone_id)
        save_schedules_atomically(schedule_items)

    _reschedule_all_jobs()


# Routes

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/logs")
def view_logs():
    return render_template("logs.html")


@app.get("/api/status")
def api_status():
    return jsonify(
        {
            "pin_state": any(c.pin_state for c in zone_controllers.values()),
            "scheduler_running": _scheduler.running,
            "active_jobs": len(_scheduler.get_jobs()),
        }
    )


# Zones API
@app.get("/api/zones")
def get_zones():
    return jsonify(zones)


@app.post("/api/zones")
def create_zone():
    global zones
    payload = request.get_json(force=True, silent=False) or {}
    try:
        name = str(payload["name"]).strip()
        gpio_pin = int(payload["gpio_pin"])  # BCM numbering
        voltage = str(payload.get("voltage", "")).strip() or None
    except Exception:
        return jsonify({"error": "Invalid payload"}), 400

    if not name:
        return jsonify({"error": "Name required"}), 400
    if gpio_pin <= 0:
        return jsonify({"error": "gpio_pin must be positive"}), 400

    new_id = (max([z["id"] for z in zones]) + 1) if zones else 1
    new_zone = {"id": new_id, "name": name, "gpio_pin": gpio_pin, "voltage": voltage}
    zones.append(new_zone)
    save_zones_atomically(zones)
    # Create controller for new zone
    zone_controllers[new_id] = PinController(gpio_pin)
    return jsonify(new_zone), 201


@app.put("/api/zones/<int:zone_id>")
def update_zone(zone_id: int):
    global zones
    payload = request.get_json(force=True, silent=False) or {}
    target = next((z for z in zones if z["id"] == zone_id), None)
    if not target:
        return jsonify({"error": "Not found"}), 404

    if "name" in payload:
        name = str(payload["name"]).strip()
        if not name:
            return jsonify({"error": "Name required"}), 400
        target["name"] = name

    if "gpio_pin" in payload:
        try:
            gpio_pin = int(payload["gpio_pin"])  # BCM numbering
        except Exception:
            return jsonify({"error": "Invalid gpio_pin"}), 400
        if gpio_pin <= 0:
            return jsonify({"error": "gpio_pin must be positive"}), 400
        target["gpio_pin"] = gpio_pin
        # Recreate controller for this zone
        zone_controllers[zone_id] = PinController(gpio_pin)

    if "voltage" in payload:
        voltage = str(payload["voltage"]).strip() or None
        target["voltage"] = voltage

    save_zones_atomically(zones)
    return jsonify(target)


@app.delete("/api/zones/<int:zone_id>")
def delete_zone(zone_id: int):
    global zones, schedule_items
    # Prevent deletion if schedules reference the zone
    if any(int(s.get("zone_id")) == zone_id for s in schedule_items):
        return jsonify({"error": "Zone is in use by schedules"}), 400

    before = len(zones)
    zones = [z for s in zones if s["id"] != zone_id]
    if len(zones) == before:
        return jsonify({"error": "Not found"}), 404
    save_zones_atomically(zones)
    zone_controllers.pop(zone_id, None)
    return jsonify({"ok": True})


# Schedule API
@app.get("/api/schedule")
def get_schedule():
    return jsonify(schedule_items)


@app.post("/api/schedule")
def create_schedule():
    payload = request.get_json(force=True, silent=False) or {}

    try:
        name = str(payload["name"]).strip()
        interval_minutes = int(payload["interval_minutes"])  # 1..1440
        duration_seconds = int(payload["duration_seconds"])  # 1..300
        enabled = bool(payload.get("enabled", True))
        # Prefer GPIO 17 zone by default
        gpio17_zone_id = next((int(z["id"]) for z in zones if int(z.get("gpio_pin", -1)) == 17), None)
        zone_id = int(payload.get("zone_id", gpio17_zone_id or zones[0]["id"]))
    except Exception:
        return jsonify({"error": "Invalid payload"}), 400

    if not name:
        return jsonify({"error": "Name required"}), 400
    if not (1 <= interval_minutes <= 1440):
        return jsonify({"error": "interval_minutes must be 1..1440"}), 400
    if not (1 <= duration_seconds <= 300):
        return jsonify({"error": "duration_seconds must be 1..300"}), 400
    if zone_id not in {z["id"] for z in zones}:
        return jsonify({"error": "Invalid zone_id"}), 400

    new_id = (max([s["id"] for s in schedule_items]) + 1) if schedule_items else 1
    new_item = {
        "id": new_id,
        "name": name,
        "interval_minutes": interval_minutes,
        "duration_seconds": duration_seconds,
        "enabled": enabled,
        "zone_id": zone_id,
        "created_at": datetime.utcnow().isoformat(),
    }
    schedule_items.append(new_item)
    save_schedules_atomically(schedule_items)
    _reschedule_all_jobs()
    return jsonify(new_item), 201


@app.put("/api/schedule/<int:item_id>")
def update_schedule(item_id: int):
    payload = request.get_json(force=True, silent=False) or {}
    target = next((s for s in schedule_items if s["id"] == item_id), None)
    if not target:
        return jsonify({"error": "Not found"}), 404

    if "name" in payload:
        name = str(payload["name"]).strip()
        if not name:
            return jsonify({"error": "Name required"}), 400
        target["name"] = name

    if "interval_minutes" in payload:
        interval_minutes = int(payload["interval_minutes"])
        if not (1 <= interval_minutes <= 1440):
            return jsonify({"error": "interval_minutes must be 1..1440"}), 400
        target["interval_minutes"] = interval_minutes  # FIXED: was duration_seconds

    if "duration_seconds" in payload:
        duration_seconds = int(payload["duration_seconds"])
        if not (1 <= duration_seconds <= 300):
            return jsonify({"error": "duration_seconds must be 1..300"}), 400
        target["duration_seconds"] = duration_seconds  # FIXED: was missing

    if "enabled" in payload:
        target["enabled"] = bool(payload["enabled"])

    if "zone_id" in payload:
        zone_id = int(payload["zone_id"])
        if zone_id not in {z["id"] for z in zones}:
            return jsonify({"error": "Invalid zone_id"}), 400
        target["zone_id"] = zone_id

    save_schedules_atomically(schedule_items)
    _reschedule_all_jobs()
    return jsonify(target)


@app.delete("/api/schedule/<int:item_id>")
def delete_schedule(item_id: int):
    global schedule_items
    before = len(schedule_items)
    schedule_items = [s for s in schedule_items if s["id"] != item_id]
    if len(schedule_items) == before:
        return jsonify({"error": "Not found"}), 404
    save_schedules_atomically(schedule_items)
    _reschedule_all_jobs()
    return jsonify({"ok": True})


# Logs API
@app.get("/api/logs")
def get_logs():
    try:
        log_file = "logs/aeroponics.log"
        if not os.path.exists(log_file):
            return jsonify({"logs": [], "error": "Log file not found"})
        
        with open(log_file, 'r') as f:
            lines = f.readlines()
        
        # Get last 100 lines, reverse order (newest first)
        logs = lines[-100:][::-1]
        return jsonify({"logs": logs})
    except Exception as e:
        logger.error(f"Error reading logs: {e}")
        return jsonify({"logs": [], "error": str(e)})


# Quick control API
@app.post("/api/pin/activate")
def api_pin_activate():
    payload = request.get_json(force=True, silent=False) or {}
    try:
        duration_seconds = int(payload.get("duration_seconds", 1))
        gpio17_zone_id = next((int(z["id"]) for z in zones if int(z.get("gpio_pin", -1)) == 17), None)
        zone_id = int(payload.get("zone_id", gpio17_zone_id or zones[0]["id"]))
    except Exception:
        return jsonify({"error": "Invalid payload"}), 400

    if zone_id not in {z["id"] for z in zones}:
        return jsonify({"error": "Invalid zone_id"}), 400

    zone_name = next((z["name"] for z in zones if z["id"] == zone_id), f"Zone {zone_id}")
    logger.info(f"🎯 QUICK CONTROL: {zone_name} (GPIO {zone_controllers[zone_id].pin_number}) for {duration_seconds} seconds")
    
    _run_watering(zone_id=zone_id, duration_seconds=duration_seconds)
    return jsonify({"ok": True})


# Startup
_load_on_startup()


def _start_scheduler_once() -> None:
    if not _scheduler.running:
        _scheduler.start()


_start_scheduler_once()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    # Disable Flask debug logging
    app.run(host="0.0.0.0", port=port, debug=False)

