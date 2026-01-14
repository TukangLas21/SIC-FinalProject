// ===============================================
// ESP32-S3 Lab Room Air Condition Controller
// Adapted from working code pattern
// ===============================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// --- WiFi & MQTT Configuration ---
#define SSID "tukanglas"
#define PASSWORD "krimsupjamur1610"
#define MQTT_SERVER "broker.hivemq.com"
#define MQTT_PORT 1883
#define PUBLISH_TOPIC "lab/room-01/sensors"

// --- Pin Configuration ---
#define DHTPIN 6      // DHT11 Data Pin
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(SSID);
  WiFi.begin(SSID, PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n===============================================");
  Serial.println("ESP32-S3 Lab Room Controller");
  Serial.println("Simple DHT11 Test");
  Serial.println("===============================================\n");
  
  dht.begin();
  Serial.println("DHT11 initialized");
  
  setup_wifi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  
  Serial.println("\n===============================================");
  Serial.println("System Ready!");
  Serial.println("===============================================\n");
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Send data every 5 seconds
  static unsigned long lastMsg = 0;
  unsigned long now = millis();
  if (now - lastMsg > 5000) {
    lastMsg = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("Failed to read DHT sensor!");
      return;
    }

    Serial.print("Temp: "); Serial.print(t);
    Serial.print("°C | Humidity: "); Serial.print(h); Serial.println("%");

    // Create JSON Payload
    StaticJsonDocument<200> doc;
    doc["ts"] = now / 1000;
    doc["temp"] = round(t * 10) / 10.0;
    doc["hum"] = round(h * 10) / 10.0;
    doc["fan_in"] = 0;
    doc["fan_ex"] = 0;
    doc["amps"] = 0;
    doc["door"] = 0;
    
    char buffer[256];
    serializeJson(doc, buffer);

    // Publish to MQTT
    if (client.publish(PUBLISH_TOPIC, buffer)) {
      Serial.print("Published: ");
      Serial.println(buffer);
    } else {
      Serial.println("Publish failed!");
    }
  }
}
