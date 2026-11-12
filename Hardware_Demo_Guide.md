# Portable Smart Grid Kit - Hardware Demo Guide

## Overview
This document outlines the complete hardware setup for your GridGuard AI demo, designed to work seamlessly with the Huawei Cloud technology stack. The entire system operates on safe 12V DC power, making it travel-friendly and presentation-safe.

---

## 🏙️ 1. Miniature City Components (The Load)

### Power Supply
- **12V DC Power Supply (5A minimum)**
  - Acts as the "substation"
  - Eliminates lethal mains voltage risk
  - Travel-friendly for airport security
  - **Huawei Integration**: Power consumption data sent to ModelArts for AI analysis

### House Structures (5 units)
#### Legal Houses (3 units)
- **3D-printed or cardboard house shells**
- **12V LED bulbs** (standard 12V automotive LEDs work perfectly)
- **Current draw**: ~20mA per house (safe, legal consumption)
- **Huawei Integration**: Each house monitored by ESP32-CAM → IoT platform

#### Thief Houses (2 units)
- **Same structure as legal houses**
- **12V LED bulb** + **High-wattage resistor** (10Ω, 25W) in parallel
- **Toggle switch** (hidden on back) to control resistor
- **Current draw**: 20mA (LED only) → 1.2A (LED + resistor when switch flipped)
- **Huawei Integration**: Sudden current spike triggers AI detection via ModelArts

### Camera System
- **5x ESP32-CAM modules**
  - One camera per house
  - One camera for main circuit overview
  - **Huawei Integration**: Live feeds → OBS → Cloud storage → Dashboard
  - Power: 5V (use 12V→5V buck converters)

### Grid Infrastructure
- **Solderless breadboard** (large, 830+ tie points)
- **22-24 AWG jumper wires** (colored for clarity)
  - Red: Positive 12V
  - Black: Ground
  - Yellow: Signal lines
- **Modular design** for easy assembly/packing

---

## 🛡️ 2. GridGuard AI Box (The Sentinel)

### Core Controller
- **XIAO ESP32-S3 Sense**
  - Dual-core processor for TinyML inference
  - Built-in Wi-Fi for Huawei Cloud connectivity
  - Ultra-compact for professional presentation
  - **Huawei Integration**: MQTT → IoTDA → ModelArts for real-time AI

### Current Sensing
- **Miniature Flexible Rogowski Coil**
  - Non-invasive current measurement
  - Linear response, no saturation
  - **Critical**: Must be Rogowski (not iron-core CT)
  - **Huawei Integration**: Analog readings → Digital processing → Cloud telemetry

### Power Control
#### Option A: Mechanical Relay (Theatrical)
- **12V Mechanical Relay** (SPDT, 10A rating)
- **Audible "CLACK" for dramatic effect
- **Fly-back diode required**: 1N5818 Schottky diode
- **Wiring**: Diode in reverse across relay coil terminals

#### Option B: Solid-State Relay (Modern)
- **12V Solid-State Relay** (SSR)
- - Silent operation, nanosecond switching
- No fly-back diode needed
- **Huawei Integration**: Faster response time for edge computing

### Theatrical Element
- **Miniature Linear Actuator** (12V, 50mm stroke)
- **Physical "shove" action** for demo impact
- **Synchronized** with relay activation
- **Mounting**: Position to remove thief's jumper wire visually

---

## 📡 3. Dashboard Integration (Huawei Cloud)

### Hardware-to-Cloud Pipeline
```
ESP32-S3 → Wi-Fi → Huawei IoTDA → ModelArts → Dashboard
ESP32-CAMs → Wi-Fi → OBS → Cloud Storage → Streamlit Dashboard
```

### Dashboard Features
- **Live camera feeds** (5 streams)
- **Real-time current monitoring** (Rogowski coil data)
- **AI detection alerts** (ModelArts inference results)
- **GPS simulation** (thief location mapping)
- **Timestamp logging** (audit trail)

### Huawei Services Used
- **IoTDA**: Device authentication and data ingestion
- **ModelArts**: AI/ML inference for theft detection
- **OBS**: Video storage and CDN delivery
- **ROMA Connect**: Message queuing for real-time alerts
- **IAM**: Secure access control for dashboard

---

## 🛒 Shopping List

### Electronics
| Item | Quantity | Approx. Cost | Notes |
|------|----------|--------------|-------|
| XIAO ESP32-S3 Sense | 1 | $15 | Core AI controller |
| ESP32-CAM | 5 | $35 | One per house + overview |
| 12V DC Power Supply 5A | 1 | $25 | Substation equivalent |
| 12V LED Bulbs | 5 | $10 | House lighting |
| 10Ω 25W Resistors | 2 | $8 | Theft simulation |
| Miniature Rogowski Coil | 1 | $40 | Critical sensor |
| 12V Mechanical Relay | 1 | $8 | Power control |
| 1N5818 Schottky Diode | 1 | $2 | Relay protection |
| Miniature Linear Actuator | 1 | $25 | Theatrical effect |
| 12V→5V Buck Converters | 6 | $12 | Camera power |
| Large Breadboard | 1 | $12 | Grid infrastructure |
| Jumper Wire Kit | 1 | $15 | Wiring |
| Toggle Switches | 2 | $6 | Theft activation |

### Mechanical/Display
| Item | Quantity | Approx. Cost | Notes |
|------|----------|--------------|-------|
| 3D Printer Filament | 1 roll | $25 | House structures |
| Mini Projector Stand | 1 | $30 | Demo presentation |
| Carrying Case | 1 | $50 | Travel protection |

**Total Estimated Cost**: ~$320

---

## 🔧 Assembly Instructions

### Step 1: Power Distribution
1. Mount 12V power supply centrally
2. Connect to breadboard power rails
3. Install 5x buck converters for ESP32-CAMs
4. Add main power switch for safety

### Step 2: House Wiring
1. Create 5 house circuits on breadboard
2. Wire 3 legal houses: 12V → LED → Ground
3. Wire 2 thief houses: 12V → LED + Resistor (parallel) → Ground
4. Install toggle switches for resistor control

### Step 3: Sensor Installation
1. Clip Rogowski coil around main 12V positive wire
2. Connect coil output to ESP32-S3 analog input
3. Calibrate: 20mA = legal, 1.2A = theft threshold

### Step 4: Control Circuit
1. Connect ESP32-S3 digital pin to relay coil
2. Install fly-back diode across relay terminals
3. Wire relay contacts to thief house power lines
4. Connect linear actuator to separate ESP32-S3 pin

### Step 5: Camera Setup
1. Position ESP32-CAMs to view each house
2. Connect to 5V power from buck converters
3. Configure Wi-Fi credentials
4. Test video streaming

---

## 💻 Software Integration

### ESP32-S3 Code Structure
```cpp
// Core AI Detection Logic
void loop() {
  float current = readRogowskiCoil();
  
  if (current > THEFT_THRESHOLD) {
    // Theft detected
    activateRelay();
    activateActuator();
    sendAlertToHuawei();
  }
  
  // Send telemetry to Huawei Cloud
  sendTelemetry(current, timestamp);
  delay(100);
}
```

### Huawei Cloud Integration
```python
# ModelArts AI Model
def detect_theft(current_data):
    # TinyML inference
    prediction = model.predict(current_data)
    return prediction > 0.8  # Theft confidence

# Dashboard (Streamlit)
def create_dashboard():
    st.title("GridGuard AI Control Center")
    
    # Live camera feeds
    for i in range(5):
        st.image(get_camera_feed(i))
    
    # Real-time monitoring
    current_data = get_telemetry()
    st.line_chart(current_data)
    
    # Alert system
    if is_theft_detected():
        st.error("⚠️ THEFT DETECTED!")
        st.map(thief_location)
```

---

## ✈️ Travel & Security Considerations

### Airport Security
- **12V DC system**: No mains voltage concerns
- **No lithium batteries**: Use power supply at venue
- **Modular design**: Easy disassembly/reassembly
- **Documentation**: Carry technical specs sheet

### Packing List
- [ ] All electronic components in anti-static bags
- [ ] 3D-printed house structures
- [ ] Breadboard with pre-wired circuits
- [ ] Laptop with pre-loaded software
- [ ] Power cords and adapters
- [ ] Spare fuses and components

### Setup Time
- **Assembly**: 15 minutes
- **Software boot**: 5 minutes
- **Calibration**: 5 minutes
- **Total setup**: 25 minutes

---

## 🎯 Demo Script

### 1. Introduction (2 minutes)
- Show miniature city with all lights on
- Explain 12V safety architecture
- Introduce Huawei Cloud integration

### 2. Normal Operation (1 minute)
- Show dashboard with legal consumption
- Display live camera feeds
- Demonstrate real-time monitoring

### 3. Theft Simulation (2 minutes)
- Flip hidden switch on "Thief House 1"
- Show current spike on dashboard
- AI detection via ModelArts
- **Theatrical**: Relay "CLACK" + actuator shoves wire
- Thief house goes dark immediately

### 4. Recovery (1 minute)
- Reset system
- Show audit trail and logging
- Explain Huawei Cloud benefits

### 5. Q&A (4 minutes)

---

## 🔧 Integration with Project Work Breakdown

### Day 1-2: Hardware Procurement
- **Sean**: Order components, 3D print houses
- **Bandile**: Review hardware security, create risk assessment
- **Tshego**: Prepare power system documentation

### Day 3-4: Assembly & Testing
- **Sean**: Assemble hardware, write ESP32 code
- **Bandile**: Security testing of hardware
- **Tshego**: Power system validation

### Day 5-7: Integration & Demo
- **All teams**: Hardware-software integration
- **Sean**: Dashboard development with Huawei Cloud
- **Bandile**: Final security validation
- **Tshego**: Performance optimization

---

## 🎭 Success Metrics

### Technical Success
- [ ] Theft detection < 100ms
- [ ] False positive rate < 1%
- [ ] System uptime > 99.9%
- [ ] Dashboard latency < 500ms

### Presentation Success
- [ ] Visual impact (theatrical cut)
- [ ] Technical credibility (real AI)
- [ ] Safety demonstration (12V system)
- [ ] Huawei Cloud integration visible

This hardware setup transforms your software demo into a compelling, physical demonstration that proves GridGuard AI works in the real world while maintaining complete safety and travel convenience.
