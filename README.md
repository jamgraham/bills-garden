# Bill's Aeroponics - Smart Watering System

A Raspberry Pi-based web application for controlling a 3V pin with advanced scheduling capabilities for aeroponics systems.

## Connect
ssh pi@raspberrypi.local

# Enable service
sudo nano /etc/systemd/system/bills-garden.service

## Features

- 🌱 **Modern Web Interface**: Beautiful, responsive design with real-time status updates
- ⏰ **Advanced Scheduling**: Create, edit, and manage watering schedules with custom intervals
- 🎛️ **Quick Control**: Manual pin activation with customizable duration
- 📊 **Real-time Monitoring**: Live system status and pin state indicators
- 🔄 **Persistent Storage**: Schedules are saved and restored on system restart
- 📱 **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices

## Hardware Requirements

- Raspberry Pi (3, 4, or newer)
- 3V relay module or transistor circuit for pin control
- Power supply for your aeroponics system
- Network connection (WiFi or Ethernet)

## GPIO Pin Configuration

The system uses BCM **GPIO 17** by default. You can change pins via Manage Zones in the UI or by editing `zones.json`.

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd plant-waterer
```

### 2. Install Dependencies

#### **Option A: Virtual Environment (Recommended for Raspberry Pi)**

If you encounter "externally-managed-environment" errors on newer Raspberry Pi OS:

```bash
# Install system dependencies
sudo apt update
sudo apt install python3-venv python3-pip

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# Install RPi.GPIO specifically for Raspberry Pi
pip install RPi.GPIO
```

#### **Option B: System-wide Installation**

```bash
pip3 install -r requirements.txt
```

### 3. Set Up GPIO (Optional but Recommended)

If you haven't already, enable GPIO access:

```bash
sudo usermod -a -G gpio $USER
```

### 4. Run the Application

#### **If using Virtual Environment:**
```bash
# Activate virtual environment (if not already active)
source venv/bin/activate

# Run the application
python app.py
```

#### **If using System Installation:**
```bash
python3 app.py
```

The web interface will be available at `http://your-raspberry-pi-ip:5001`

## Usage

### Quick Control
- Set the duration in seconds (1-300)
- Click "Activate Now" to immediately activate the selected zone (defaults to GPIO 17)

### Creating Schedules
1. Click "Add Schedule" button
2. Enter a descriptive name
3. Set the interval in minutes (1-1440)
4. Set the duration in seconds (1-300)
5. Choose whether to enable immediately
6. Click "Create Schedule"

### Managing Schedules
- **Edit**: Modify schedule parameters
- **Test**: Activate the pin with the schedule's duration
- **Delete**: Remove unwanted schedules
- **Enable/Disable**: Toggle schedule activation

## API Endpoints

### GET `/api/schedule`
Retrieve all schedules

### POST `/api/schedule`
Create a new schedule
```json
{
  "name": "Morning Watering",
  "interval_minutes": 60,
  "duration_seconds": 30,
  "enabled": true,
  "zone_id": 1
}
```

### PUT `/api/schedule/<id>`
Update an existing schedule

### DELETE `/api/schedule/<id>`
Delete a schedule

### POST `/api/pin/activate`
Activate pin immediately
```json
{
  "duration_seconds": 30,
  "zone_id": 1
}
```

### GET `/api/status`
Get system status
```json
{
  "pin_state": false,
  "scheduler_running": true,
  "active_jobs": 2
}
```

### Zones
- GET `/api/zones`
- POST `/api/zones`
- PUT `/api/zones/<id>`
- DELETE `/api/zones/<id>`

## File Structure

```
plant-waterer/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── schedule.json          # Schedule storage (auto-generated)
├── zones.json             # Zone storage (auto-generated/managed)
├── templates/
│   └── index.html         # Main web interface
├── static/
│   ├── css/
│   │   └── style.css      # Modern styling
│   └── js/
│       └── app.js         # Frontend functionality
└── README.md              # This file
```

## Configuration

### Port Configuration
The default port is 5000. To change it, modify the last line in `app.py`:

```python
app.run(host='0.0.0.0', port=8080, debug=True)
```

### Auto-start on Boot
To run the application automatically on boot, create a systemd service:

```bash
sudo nano /etc/systemd/system/aeroponics.service
```

Add the following content:
```ini
[Unit]
Description=Bill's Aeroponics Smart Watering System
After=network.target
Wants=network.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/plant-waterer
ExecStart=/home/pi/plant-waterer/venv/bin/python /home/pi/plant-waterer/app.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Environment variables
Environment=PYTHONUNBUFFERED=1

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/pi/plant-waterer

[Install]
WantedBy=multi-user.target
```

**Important**: Make sure to use the correct path to your virtual environment's Python interpreter. If you created the virtual environment in a different location, update the `ExecStart` path accordingly.

Enable and start the service:
```bash
sudo systemctl enable aeroponics.service
sudo systemctl start aeroponics.service
sudo systemctl status aeroponics.service
sudo systemctl stop aeroponics.service
sudo systemctl disable aeroponics.service
journalctl -u aeroponics1.service -f
```

## Troubleshooting

### GPIO Permission Issues
If you encounter GPIO permission errors:
```bash
sudo usermod -a -G gpio $USER
sudo reboot
```

### Port Already in Use
If port 5000 is already in use, change the port in `app.py` or kill the existing process:
```bash
sudo lsof -ti:5000 | xargs kill -9
```

### Schedule Not Working
- Check that the scheduler is running (green status dot)
- Verify GPIO pin connections
- Check the console output for error messages

## Safety Features

- Maximum duration limit of 300 seconds (5 minutes)
- Input validation on all forms
- Graceful error handling
- Automatic pin deactivation after duration expires

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.

---

**Bill's Aeroponics** - Growing smarter, not harder! 🌱 