# Hardware Setup Guide - Bill's Aeroponics

## GPIO Pin Configuration

The system uses **GPIO 18** for 3V pin control. Here's how to connect your hardware:

## Basic Wiring Diagram

```
Raspberry Pi                    Relay Module
┌─────────────┐                ┌─────────────┐
│             │                │             │
│ GPIO 18 ────┼────────────────┼─── IN1      │
│             │                │             │
│ 3.3V ───────┼────────────────┼─── VCC      │
│             │                │             │
│ GND ────────┼────────────────┼─── GND      │
│             │                │             │
└─────────────┘                └─────────────┘
                                        │
                                        │
                                ┌───────▼───────┐
                                │               │
                                │ Water Pump    │
                                │ or Solenoid   │
                                │               │
                                └───────────────┘
```

## Component List

### Required Components:
1. **Raspberry Pi** (3, 4, or newer)
2. **5V Relay Module** (1-channel or 2-channel)
3. **Water Pump** or **Solenoid Valve** (12V or 24V)
4. **Power Supply** for pump/valve
5. **Jumper Wires** (Male-to-Female)
6. **Breadboard** (optional, for testing)

### Optional Components:
1. **LED Indicator** (to show when pin is active)
2. **Resistor** (220Ω for LED)
3. **Diode** (1N4007 for relay protection)

## Detailed Wiring Instructions

### Step 1: Relay Module Connection
```
Raspberry Pi Pin    →    Relay Module Pin
─────────────────────────────────────────
GPIO 18 (Pin 12)   →    IN1 (Signal)
3.3V (Pin 1)       →    VCC (Power)
GND (Pin 6)        →    GND (Ground)
```

### Step 2: Power Supply Connection
```
Power Supply       →    Relay Module
─────────────────────────────────────────
12V/24V +         →    COM (Common)
12V/24V -         →    NO (Normally Open)
```

### Step 3: Water Pump/Valve Connection
```
Relay Module       →    Water Pump/Valve
─────────────────────────────────────────
COM (Common)       →    Positive (+)
NO (Normally Open) →    Negative (-)
```

## Alternative: Direct Transistor Control

If you prefer not to use a relay module, you can use a transistor:

```
Raspberry Pi                    Transistor Circuit
┌─────────────┐                ┌─────────────┐
│             │                │             │
│ GPIO 18 ────┼────────────────┼─── Base     │
│             │                │             │
│ 3.3V ───────┼────────────────┼─── Collector│
│             │                │             │
│ GND ────────┼────────────────┼─── Emitter  │
│             │                │             │
└─────────────┘                └─────────────┘
                                        │
                                        │
                                ┌───────▼───────┐
                                │               │
                                │ Water Pump    │
                                │               │
                                └───────────────┘
```

### Transistor Components:
- **NPN Transistor** (2N2222A or similar)
- **Resistor** (1kΩ for base)
- **Diode** (1N4007 for protection)

## Safety Considerations

### 1. Electrical Safety
- Always disconnect power before making connections
- Use appropriate wire gauges for your current requirements
- Ensure proper grounding
- Consider using a fuse for protection

### 2. Water Safety
- Use waterproof connectors for water pump connections
- Keep electrical components away from water
- Consider using a GFCI outlet for additional protection

### 3. System Protection
- Add a diode across relay coil to prevent voltage spikes
- Use appropriate power supply ratings
- Consider adding a fuse for overcurrent protection

## Testing Your Setup

### 1. Run the GPIO Test
```bash
python3 test_gpio.py
```

### 2. Check Connections
- Verify all connections are secure
- Test with a multimeter if available
- Listen for relay clicks when pin activates

### 3. Test Water Flow
- Start with short durations (1-3 seconds)
- Gradually increase duration as needed
- Monitor for any leaks or issues

## Troubleshooting

### Common Issues:

1. **Relay not clicking**
   - Check GPIO pin number in code
   - Verify power supply to relay
   - Check all connections

2. **Pump not running**
   - Verify power supply voltage
   - Check relay connections
   - Test pump directly with power supply

3. **GPIO permission errors**
   - Run: `sudo usermod -a -G gpio $USER`
   - Reboot: `sudo reboot`

4. **System not responding**
   - Check network connection
   - Verify port 5000 is not in use
   - Check application logs

## Power Requirements

### Relay Module:
- **Voltage**: 3.3V-5V (from Raspberry Pi)
- **Current**: ~20-30mA

### Water Pump (Typical):
- **Voltage**: 12V or 24V
- **Current**: 0.5A-2A (depending on pump size)
- **Power Supply**: Choose appropriate rating

### Solenoid Valve (Typical):
- **Voltage**: 12V or 24V
- **Current**: 0.2A-1A
- **Power Supply**: Choose appropriate rating

## Recommended Power Supplies

### For Small Systems:
- **12V, 2A** power supply
- Suitable for small pumps and valves

### For Larger Systems:
- **24V, 5A** power supply
- Better for larger pumps and multiple valves

## Advanced Setup

### Multiple Zones:
You can expand the system to control multiple zones by:
1. Using a multi-channel relay module
2. Adding additional GPIO pins
3. Modifying the code to support multiple pins

### Sensor Integration:
Consider adding:
- **Moisture sensors** for soil-based systems
- **Water level sensors** for reservoir monitoring
- **Temperature sensors** for environmental monitoring

---

**⚠️ Important**: Always test your setup with low durations first and monitor the system during initial operation. 