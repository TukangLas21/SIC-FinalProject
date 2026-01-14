"""
BSL Lab HVAC IoT Service
Bridges MQTT (HiveMQ) ↔ FastAPI ↔ PostgreSQL

Architecture:
- Subscribes to sensor data from hardware (MQTT)
- Stores data in PostgreSQL
- Exposes REST API for web frontend
- Publishes control commands to hardware (MQTT)
- AI Integration: Anomaly detection and AC control predictions
"""

import json
import os
import pickle
import time
from datetime import datetime
from typing import Optional

import numpy as np
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

# ==================== Configuration ====================
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_CLIENT_ID = "bsl_iot_service"

DATABASE_URL = os.getenv("DATABASE_URL")

# AI Model Paths
ANOMALY_MODEL_PATH = "../ai/anomaly_detection_model.pkl"
AC_CONTROL_MODEL_PATH = "../ai/ac_control_model.pkl"

# ==================== FastAPI App ====================
app = FastAPI(title="BSL Lab IoT Service", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Database Connection ====================
def get_db_connection():
    """Get PostgreSQL connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


# ==================== Load AI Models ====================
anomalies_model = None
ac_control_model = None

try:
    with open(ANOMALY_MODEL_PATH, "rb") as f:
        anomaly_model = pickle.load(f)
    print(f"✅ Loaded anomaly detection model")
except Exception as e:
    print(f"⚠️  Anomaly model not loaded: {e}")
    anomaly_model = None

try:
    with open(AC_CONTROL_MODEL_PATH, "rb") as f:
        ac_control_model = pickle.load(f)
    print(f"✅ Loaded AC control model")
except Exception as e:
    print(f"⚠️  AC control model not loaded: {e}")
    ac_control_model = None

# Store latest sensor data for AI processing
latest_sensor_data = {}


# ==================== MQTT Topics Structure ====================
"""
Topic Structure for BSL Lab:

1. Sensor Data (Hardware → Service):
   - lab/room/{room_id}/sensor/temperature
   - lab/room/{room_id}/sensor/humidity
   - lab/room/{room_id}/sensor/all (JSON with all readings)

2. Power Monitoring (Hardware → Service):
   - lab/component/{component_id}/power (JSON: {voltage, current, power})

3. Component Control (Service → Hardware):
   - lab/component/{component_id}/control (JSON: {isActive, setting})
   - lab/component/{component_id}/status (Hardware acknowledges)

4. System Commands:
   - lab/system/emergency (Emergency shutdown)
   - lab/system/status (System health)
"""

# ==================== MQTT Client Setup ====================
mqtt_client = mqtt.Client(client_id=MQTT_CLIENT_ID, protocol=mqtt.MQTTv5)


def on_connect(client, userdata, flags, rc, properties=None):
    """Callback when connected to MQTT broker"""
    print(f"✅ Connected to HiveMQ broker at {MQTT_BROKER}:{MQTT_PORT}")
    
    # Subscribe to all sensor topics
    client.subscribe("lab/room/+/sensor/#")
    client.subscribe("lab/component/+/power")
    client.subscribe("lab/component/+/status")
    
    # Subscribe to firmware sensor data (for AI processing)
    client.subscribe("lab/room-01/sensors")
    print("📡 Subscribed to sensor, power, and AI topics")


def on_message(client, userdata, msg):
    """Callback when MQTT message received"""
    topic = msg.topic
    payload = msg.payload.decode()
    
    try:
        # Parse topic to determine message type
        parts = topic.split("/")
        
        if topic == "lab/room-01/sensors":
            # Firmware sensor data (for AI processing)
            handle_firmware_sensor_data(payload)
            
        elif "sensor" in topic and "all" in topic:
            # Full sensor reading: lab/room/{room_id}/sensor/all
            room_id = parts[2]
            handle_sensor_data(room_id, payload)
            
        elif "power" in topic:
            # Power monitoring: lab/component/{component_id}/power
            component_id = parts[2]
            handle_power_data(component_id, payload)
            
        elif "status" in topic:
            # Component status update
            component_id = parts[2]
            handle_component_status(component_id, payload)
            
    except Exception as e:
        print(f"❌ Error processing message on {topic}: {e}")


def handle_sensor_data(room_id: str, payload: str):
    """Store sensor data in PostgreSQL"""
    try:
        data = json.loads(payload)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO "SensorLog" (
                "roomId", temperature, humidity,
                "anomalyStatus", "createdAt"
            ) VALUES (%s, %s, %s, %s, %s)
        """, (
            room_id,
            data.get("temperature", 0.0),
            data.get("humidity", 0.0),
            data.get("anomalyStatus", "NORMAL"),
            datetime.now()
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"📊 Stored sensor data for room {room_id}")
        
    except Exception as e:
        print(f"❌ Error storing sensor data: {e}")


def handle_power_data(component_id: str, payload: str):
    """Store power monitoring data in PostgreSQL"""
    try:
        data = json.loads(payload)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO "PowerLog" (
                "componentId", voltage, current, power, "createdAt"
            ) VALUES (%s, %s, %s, %s, %s)
        """, (
            component_id,
            data.get("voltage", 0.0),
            data.get("current", 0.0),
            data.get("power", 0.0),
            datetime.now()
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"⚡ Stored power data for component {component_id}")
        
    except Exception as e:
        print(f"❌ Error storing power data: {e}")


def handle_component_status(component_id: str, payload: str):
    """Update component status from hardware acknowledgment"""
    try:
        data = json.loads(payload)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE "Component"
            SET "isActive" = %s, setting = %s, "updatedAt" = %s
            WHERE id = %s
        """, (
            data.get("isActive", False),
            data.get("setting"),
            datetime.now(),
            component_id
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"🔄 Updated component {component_id} status")
        
    except Exception as e:
        print(f"❌ Error updating component status: {e}")


# ==================== AI Functions ====================

def detect_anomaly(sensor_data):
    """Detect anomalies using ML model"""
    if anomaly_model is None:
        return False
    
    try:
        features = np.array([[
            sensor_data["temp"],
            sensor_data["hum"],
            sensor_data["fan_in"],
            sensor_data["fan_ex"],
            sensor_data["amps"]
        ]])
        
        prediction = anomaly_model.predict(features)[0]
        is_anomaly = (prediction == -1)
        
        if is_anomaly:
            print(f"⚠️  ANOMALY DETECTED: Temp={sensor_data['temp']}°C, Hum={sensor_data['hum']}%")
        
        return is_anomaly
        
    except Exception as e:
        print(f"❌ Anomaly detection error: {e}")
        return False


def predict_ac_setting(sensor_data, target_temp=24.0):
    """Predict optimal AC fan speed using ML model"""
    if ac_control_model is None:
        return 50.0
    
    try:
        features = np.array([[
            sensor_data["temp"],
            sensor_data["hum"],
            target_temp
        ]])
        
        predicted_speed = ac_control_model.predict(features)[0]
        predicted_speed = np.clip(predicted_speed, 0, 100)
        
        print(f"🤖 AC Prediction: {sensor_data['temp']}°C → {predicted_speed:.1f}% fan speed")
        
        return float(predicted_speed)
        
    except Exception as e:
        print(f"❌ AC control prediction error: {e}")
        return 50.0


def send_fan_command(target, speed):
    """Send fan control command via MQTT"""
    command = {
        "id": f"{target}_cmd_{int(time.time())}",
        "type": "SET_FAN",
        "target": target,
        "val": round(speed, 1)
    }
    
    mqtt_client.publish("lab/room-01/commands", json.dumps(command), qos=1)
    print(f"📤 Sent {target} command: {speed:.1f}%")


def handle_firmware_sensor_data(payload: str):
    """Process firmware sensor data and run AI analysis"""
    global latest_sensor_data
    
    try:
        data = json.loads(payload)
        latest_sensor_data = data
        
        print(f"📊 Firmware Data: Temp={data.get('temp')}°C, Hum={data.get('hum')}%, Fan In={data.get('fan_in')}%")
        
        # Store in database
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Determine anomaly status
        is_anomaly = detect_anomaly(data)
        anomaly_status = "ANOMALY" if is_anomaly else "NORMAL"
        
        cur.execute("""
            INSERT INTO "SensorLog" (
                "roomId", temperature, humidity,
                "anomalyStatus", "createdAt"
            ) VALUES (%s, %s, %s, %s, %s)
        """, (
            "room-01",
            data.get("temp", 0.0),
            data.get("hum", 0.0),
            anomaly_status,
            datetime.now()
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        # Run AI control logic
        target_temp = 24.0
        recommended_speed = predict_ac_setting(data, target_temp)
        current_speed = data.get("fan_in", 0)
        
        # Adaptive control: only update if significant difference
        if abs(recommended_speed - current_speed) > 5.0:
            send_fan_command("ac", recommended_speed)
        
        # Emergency response on anomaly
        if is_anomaly:
            send_fan_command("exhaust", 100.0)
        
    except Exception as e:
        print(f"❌ Error processing firmware sensor data: {e}")


# Set MQTT callbacks
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message


# ==================== REST API Endpoints ====================

@app.get("/")
def root():
    return {
        "service": "BSL Lab IoT Service",
        "status": "running",
        "mqtt_connected": mqtt_client.is_connected()
    }


@app.post("/api/component/{component_id}/control")
def control_component(component_id: str, isActive: bool, setting: Optional[float] = None):
    """
    Send control command to hardware component via MQTT
    
    Example: POST /api/component/abc123/control?isActive=true&setting=75
    """
    try:
        command = {
            "isActive": isActive,
            "setting": setting,
            "timestamp": datetime.now().isoformat()
        }
        
        topic = f"lab/component/{component_id}/control"
        mqtt_client.publish(topic, json.dumps(command), qos=1)
        
        return {
            "success": True,
            "message": f"Command sent to {component_id}",
            "command": command
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/room/{room_id}/simulate-sensor")
def simulate_sensor_data(
    room_id: str,
    temperature: float,
    humidity: float
):
    """
    Simulate sensor data (for testing without hardware)
    
    Example: POST /api/room/abc123/simulate-sensor
    Body: {"temperature": 24.5, "humidity": 45.0}
    """
    try:
        data = {
            "temperature": temperature,
            "humidity": humidity,
            "anomalyStatus": "NORMAL",
            "timestamp": datetime.now().isoformat()
        }
        
        # Store directly
        handle_sensor_data(room_id, json.dumps(data))
        
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/system/emergency-stop")
def emergency_stop():
    """Emergency shutdown - turns off all components"""
    try:
        mqtt_client.publish("lab/system/emergency", json.dumps({
            "command": "STOP_ALL",
            "timestamp": datetime.now().isoformat()
        }), qos=2)
        
        return {"success": True, "message": "Emergency stop signal sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Startup/Shutdown ====================

@app.on_event("startup")
async def startup_event():
    """Connect to MQTT broker on startup"""
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        mqtt_client.loop_start()  # Start background thread
        print(f"🚀 IoT Service started - connecting to MQTT at {MQTT_BROKER}:{MQTT_PORT}")
    except Exception as e:
        print(f"❌ Failed to connect to MQTT: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Disconnect from MQTT on shutdown"""
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    print("🛑 IoT Service stopped")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
