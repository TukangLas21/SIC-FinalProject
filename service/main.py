"""
BSL Lab HVAC IoT Service
Bridges MQTT (HiveMQ) ↔ FastAPI ↔ PostgreSQL

Architecture:
- Subscribes to sensor data from hardware (MQTT)
- Stores data in PostgreSQL
- Exposes REST API for web frontend
- Publishes control commands to hardware (MQTT)
"""

import json
import os
from datetime import datetime
from typing import Optional

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
    print("📡 Subscribed to sensor and power topics")


def on_message(client, userdata, msg):
    """Callback when MQTT message received"""
    topic = msg.topic
    payload = msg.payload.decode()
    
    try:
        # Parse topic to determine message type
        parts = topic.split("/")
        
        if "sensor" in topic and "all" in topic:
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
