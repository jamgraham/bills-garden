from __future__ import annotations

import json
import os
import tempfile
import threading
from pathlib import Path
from typing import List, Dict

_SCHEDULE_FILE = Path(__file__).parent / "schedule.json"
_ZONES_FILE = Path(__file__).parent / "zones.json"
_write_lock = threading.Lock()


def load_schedules() -> List[Dict]:
    if not _SCHEDULE_FILE.exists():
        return []
    with _SCHEDULE_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_schedules_atomically(schedules: List[Dict]) -> None:
    _SCHEDULE_FILE.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(schedules, ensure_ascii=False, indent=2, sort_keys=False)
    with _write_lock:
        fd, tmp_path = tempfile.mkstemp(prefix=_SCHEDULE_FILE.name + ".", dir=str(_SCHEDULE_FILE.parent))
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as tmp:
                tmp.write(data)
                tmp.flush()
                os.fsync(tmp.fileno())
            os.replace(tmp_path, _SCHEDULE_FILE)
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except OSError:
                pass


def load_zones() -> List[Dict]:
    if not _ZONES_FILE.exists():
        return []
    with _ZONES_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_zones_atomically(zones: List[Dict]) -> None:
    _ZONES_FILE.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(zones, ensure_ascii=False, indent=2, sort_keys=False)
    with _write_lock:
        fd, tmp_path = tempfile.mkstemp(prefix=_ZONES_FILE.name + ".", dir=str(_ZONES_FILE.parent))
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as tmp:
                tmp.write(data)
                tmp.flush()
                os.fsync(tmp.fileno())
            os.replace(tmp_path, _ZONES_FILE)
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except OSError:
                pass

