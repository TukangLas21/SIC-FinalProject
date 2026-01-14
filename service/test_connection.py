"""
Quick test script to verify MQTT + Database connection
Run this after starting docker-compose and before running main.py
"""

import paho.mqtt.client as mqtt
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def test_mqtt():
    """Test MQTT connection to HiveMQ"""
    print("🧪 Testing MQTT connection...")
    try:
        client = mqtt.Client(client_id="test_client", protocol=mqtt.MQTTv5)
        client.connect("localhost", 1883, keepalive=60)
        client.loop_start()
        
        # Publish test message
        client.publish("lab/test", "Hello from Python!", qos=1)
        print("✅ MQTT connection successful!")
        
        client.loop_stop()
        client.disconnect()
        return True
    except Exception as e:
        print(f"❌ MQTT connection failed: {e}")
        return False


def test_database():
    """Test PostgreSQL connection"""
    print("\n🧪 Testing Database connection...")
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()
        
        # Check if tables exist
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [row[0] for row in cur.fetchall()]
        
        print(f"✅ Database connection successful!")
        print(f"📊 Found tables: {', '.join(tables)}")
        
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


if __name__ == "__main__":
    print("=" * 50)
    print("BSL Lab IoT Service - Connection Test")
    print("=" * 50)
    
    mqtt_ok = test_mqtt()
    db_ok = test_database()
    
    print("\n" + "=" * 50)
    if mqtt_ok and db_ok:
        print("✅ All tests passed! Ready to run main.py")
    else:
        print("❌ Some tests failed. Check configuration.")
    print("=" * 50)
