// ===============================================
// ESP32-S3 Lab Room Air Condition Controller
// Multi-Task Architecture
// ===============================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <DHT.h>

// ===============================================
// Configuration
// ===============================================

#define WIFI_SSID "tukanglas"
#define WIFI_PASSWORD "krimsupjamur1610"

#define MQTT_BROKER "broker.hivemq.com"
#define MQTT_PORT 1883

const char* TOPIC_SENSORS = "lab/room-01/sensors";
const char* TOPIC_COMMANDS = "lab/room-01/commands";
const char* ROOM_ID = "room-01";

// ===============================================
// Pin Definitions
// ===============================================

const int INA219_SDA_PIN = 8;
const int INA219_SCL_PIN = 9;
const int DHT11_PIN = 6;
const int AC_FAN_PIN = 1;
const int EXHAUST_FAN_PIN = 2;

// ===============================================
// PWM Settings
// ===============================================

const int PWM_FREQ = 25000;
const int PWM_RESOLUTION = 8;

// ===============================================
// Sensor Objects
// ===============================================

DHT dht(DHT11_PIN, DHT11);
Adafruit_INA219 ina219;

// ===============================================
// Network Objects
// ===============================================

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ===============================================
// Global Variables (Thread-Safe with Mutex)
// ===============================================

SemaphoreHandle_t sensorDataMutex;

struct SensorData {
  float temperature;
  float humidity;
  float current_mA;
  float acFanPWM;
  float exhaustFanPWM;
  unsigned long timestamp;
};

SensorData currentData = {0, 0, 0, 0, 0, 0};

// ===============================================
// Task Handles
// ===============================================

TaskHandle_t sensorTaskHandle = NULL;
TaskHandle_t mqttTaskHandle = NULL;

// ===============================================
// Function Prototypes
// ===============================================

void sensorTask(void* parameter);
void mqttTask(void* parameter);
void setupSensors();
void setupActuators();
void setFanPWM(const char* target, float percentage);
void mqttCallback(char* topic, byte* payload, unsigned int length);
void handleCommand(JsonDocument& doc);

// ===============================================
// Setup Function
// ===============================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n===============================================");
  Serial.println("ESP32-S3 Lab Room Controller Starting...");
  Serial.println("Multi-Task Architecture");
  Serial.println("===============================================\n");
  
  // Create mutex for thread-safe access to sensor data
  sensorDataMutex = xSemaphoreCreateMutex();
  
  // Initialize I2C for INA219
  Wire.begin(INA219_SDA_PIN, INA219_SCL_PIN);
  
  // Setup hardware
  setupSensors();
  setupActuators();
  
  // Create tasks on different cores
  xTaskCreatePinnedToCore(
    sensorTask,         // Task function
    "SensorTask",       // Task name
    4096,               // Stack size (bytes)
    NULL,               // Task parameter
    1,                  // Priority (1 = low)
    &sensorTaskHandle,  // Task handle
    0                   // Core 0
  );
  
  xTaskCreatePinnedToCore(
    mqttTask,           // Task function
    "MQTTTask",         // Task name
    8192,               // Stack size (bytes) - larger for network
    NULL,               // Task parameter
    2,                  // Priority (2 = higher than sensor)
    &mqttTaskHandle,    // Task handle
    1                   // Core 1
  );
  
  Serial.println("\n===============================================");
  Serial.println("System Ready!");
  Serial.println("Core 0: Sensor Task");
  Serial.println("Core 1: MQTT Task");
  Serial.println("===============================================\n");
}

// ===============================================
// Main Loop (Empty - Tasks handle everything)
// ===============================================

void loop() {
  // Main loop is empty - FreeRTOS tasks handle everything
  vTaskDelay(pdMS_TO_TICKS(1000));
}

// ===============================================
// Sensor Task (Core 0)
// ===============================================

void sensorTask(void* parameter) {
  Serial.println("[Sensor Task] Started on Core 0");
  
  // Give DHT11 time to stabilize
  vTaskDelay(pdMS_TO_TICKS(2000));
  
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(5000); // 5 seconds (DHT11 needs 2s minimum)
  
  while (true) {
    // Read DHT11 (blocking operation)
    float temp = dht.readTemperature();
    vTaskDelay(pdMS_TO_TICKS(100)); // Small delay between reads
    
    float hum = dht.readHumidity();
    vTaskDelay(pdMS_TO_TICKS(100)); // Small delay after DHT
    
    // Read INA219
    float current = ina219.getCurrent_mA();
    
    // Update shared data (thread-safe)
    if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      if (!isnan(temp) && !isnan(hum)) {
        currentData.temperature = temp;
        currentData.humidity = hum;
      }
      currentData.current_mA = current;
      currentData.timestamp = millis();
      
      xSemaphoreGive(sensorDataMutex);
      
      // Debug output
      Serial.print("[Sensor] Temp: "); Serial.print(temp);
      Serial.print("°C | Hum: "); Serial.print(hum);
      Serial.print("% | Current: "); Serial.print(current); Serial.println(" mA");
    }
    
    // Wait for next cycle (precise timing)
    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// ===============================================
// MQTT Task (Core 1)
// ===============================================

void mqttTask(void* parameter) {
  Serial.println("[MQTT Task] Started on Core 1");
  
  // Connect to WiFi
  Serial.print("[MQTT] Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    vTaskDelay(pdMS_TO_TICKS(500));
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[MQTT] WiFi Connected!");
    Serial.print("[MQTT] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[MQTT] WiFi Connection Failed!");
  }
  
  // Configure MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(15);
  
  Serial.println("[MQTT] Client configured");
  
  TickType_t xLastPublish = xTaskGetTickCount();
  const TickType_t xPublishFrequency = pdMS_TO_TICKS(5000); // 5 seconds
  
  while (true) {
    // Reconnect if needed
    if (!mqttClient.connected()) {
      Serial.print("[MQTT] Connecting to broker...");
      
      String clientId = "ESP32-";
      clientId += String(random(0xffff), HEX);
      
      if (mqttClient.connect(clientId.c_str())) {
        Serial.println("connected");
        mqttClient.subscribe(TOPIC_COMMANDS, 0);
        Serial.print("[MQTT] Subscribed to: ");
        Serial.println(TOPIC_COMMANDS);
      } else {
        Serial.print("failed, rc=");
        Serial.println(mqttClient.state());
        vTaskDelay(pdMS_TO_TICKS(5000));
        continue;
      }
    }
    
    // Process MQTT messages
    yield(); // Allow other operations
    mqttClient.loop();
    
    // Publish sensor data every 5 seconds
    if ((xTaskGetTickCount() - xLastPublish) >= xPublishFrequency) {
      xLastPublish = xTaskGetTickCount();
      
      // Read sensor data (thread-safe)
      SensorData localData;
      if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        localData = currentData;
        xSemaphoreGive(sensorDataMutex);
        
        // Create JSON
        JsonDocument doc;
        doc["ts"] = localData.timestamp / 1000;
        doc["temp"] = round(localData.temperature * 10) / 10.0;
        doc["hum"] = round(localData.humidity * 10) / 10.0;
        doc["fan_in"] = round(localData.acFanPWM * 10) / 10.0;
        doc["fan_ex"] = round(localData.exhaustFanPWM * 10) / 10.0;
        doc["amps"] = round(localData.current_mA / 100.0) / 10.0;
        doc["door"] = 0;
        
        char jsonBuffer[256];
        serializeJson(doc, jsonBuffer);
        
        if (mqttClient.publish(TOPIC_SENSORS, jsonBuffer, false)) {
          Serial.print("[MQTT] Published: ");
          Serial.println(jsonBuffer);
        } else {
          Serial.println("[MQTT] Publish failed!");
        }
      }
    }
    
    // Small delay to prevent tight loop
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ===============================================
// MQTT Callback
// ===============================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("[MQTT] Message received: ");
  Serial.println(topic);
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.print("[MQTT] JSON error: ");
    Serial.println(error.c_str());
    return;
  }
  
  handleCommand(doc);
}

// ===============================================
// Command Handler
// ===============================================

void handleCommand(JsonDocument& doc) {
  const char* cmdId = doc["id"];
  const char* cmdType = doc["type"];
  const char* target = doc["target"];
  float value = doc["val"];
  
  Serial.println("\n[Command] Received:");
  Serial.print("  ID: "); Serial.println(cmdId);
  Serial.print("  Type: "); Serial.println(cmdType);
  Serial.print("  Target: "); Serial.println(target);
  Serial.print("  Value: "); Serial.println(value);
  
  if (strcmp(cmdType, "SET_FAN") == 0) {
    setFanPWM(target, value);
  }
}

// ===============================================
// Set Fan PWM
// ===============================================

void setFanPWM(const char* target, float percentage) {
  percentage = constrain(percentage, 0, 100);
  int pwmValue = (int)(percentage * 255.0 / 100.0);
  
  // Update shared data (thread-safe)
  if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    if (strcmp(target, "exhaust") == 0) {
      currentData.exhaustFanPWM = percentage;
      ledcWrite(EXHAUST_FAN_PIN, pwmValue);
      Serial.print("[Fan] Exhaust: ");
      Serial.print(percentage);
      Serial.println("%");
    } 
    else if (strcmp(target, "ac") == 0 || strcmp(target, "intake") == 0) {
      currentData.acFanPWM = percentage;
      ledcWrite(AC_FAN_PIN, pwmValue);
      Serial.print("[Fan] AC/Intake: ");
      Serial.print(percentage);
      Serial.println("%");
    }
    
    xSemaphoreGive(sensorDataMutex);
  }
}

// ===============================================
// Sensor Setup
// ===============================================

void setupSensors() {
  Serial.println("[Setup] Initializing sensors...");
  
  dht.begin();
  Serial.println("  ✓ DHT11");
  
  if (ina219.begin()) {
    ina219.setCalibration_32V_2A();
    Serial.println("  ✓ INA219");
  } else {
    Serial.println("  ✗ INA219 failed");
  }
}

// ===============================================
// Actuator Setup
// ===============================================

void setupActuators() {
  Serial.println("[Setup] Initializing actuators...");
  
  ledcAttach(AC_FAN_PIN, PWM_FREQ, PWM_RESOLUTION);
  ledcWrite(AC_FAN_PIN, 0);
  Serial.println("  ✓ AC Fan (Pin 1)");
  
  ledcAttach(EXHAUST_FAN_PIN, PWM_FREQ, PWM_RESOLUTION);
  ledcWrite(EXHAUST_FAN_PIN, 0);
  Serial.println("  ✓ Exhaust Fan (Pin 2)");
}
