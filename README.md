# Bill's Aeroponics - Smart Watering System

A Raspberry Pi-based web application for controlling a 3V pin with advanced scheduling capabilities for aeroponics systems.

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

The system uses **GPIO 18** for 3V pin control. You can modify this in `app.py`:

```python
PIN_3V = 18  # Change this to your preferred GPIO pin
```

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd plant-waterer
```

### 2. Install Dependencies

```bash
pip3 install -r requirements.txt
```

### 3. Set Up GPIO (Optional but Recommended)

If you haven't already, enable GPIO access:

```bash
sudo usermod -a -G gpio $USER
```

### 4. Run the Application

```bash
python3 app.py
```

The web interface will be available at `http://your-raspberry-pi-ip:5000`

## Usage

### Quick Control
- Set the duration in seconds (1-300)
- Click "Activate Now" to immediately activate the 3V pin

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

### System Status
The header shows:
- System online/offline status
- Number of active scheduled jobs
- Real-time pin state indicator

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
  "enabled": true
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
  "duration_seconds": 30
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

## File Structure

```
plant-waterer/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── schedule.json         # Schedule storage (auto-generated)
├── templates/
│   └── index.html        # Main web interface
├── static/
│   ├── css/
│   │   └── style.css     # Modern styling
│   └── js/
│       └── app.js        # Frontend functionality
└── README.md             # This file
```

## Configuration

### Changing GPIO Pin
Edit `app.py` and modify the `PIN_3V` variable:

```python
PIN_3V = 17  # Change to your preferred GPIO pin
```

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
Description=Bill's Aeroponics Web Interface
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/plant-waterer
ExecStart=/usr/bin/python3 app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable aeroponics.service
sudo systemctl start aeroponics.service
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