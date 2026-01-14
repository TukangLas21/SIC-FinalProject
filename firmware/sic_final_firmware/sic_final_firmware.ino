const int PWM_PIN = 1;  
const int ANALOG_PIN = 4; 

// PWM Settings
const int freq = 5000;      // 5 kHz frequency
const int resolution = 8;   // 8-bit resolution (0-255)

void setup() {
  Serial.begin(115200);
  
  // NEW API: Simply attach the pin with frequency and resolution.
  // The channel management is now handled automatically.
  ledcAttach(PWM_PIN, freq, resolution);

  pinMode(ANALOG_PIN, INPUT);
  
  Serial.println("ESP32-S3 PWM Controller Ready (New API)!");
  Serial.println("Enter a value between 0 and 255:");
}

void loop() {
  if (Serial.available() > 0) {
    int inputValue = Serial.parseInt();

    while(Serial.available() > 0 && (Serial.peek() == '\n' || Serial.peek() == '\r')) {
      Serial.read();
    }

    int pwmValue = constrain(inputValue, 0, 255);

    // NEW API: use ledcWrite(pin, value) instead of channel
    ledcWrite(PWM_PIN, pwmValue);

    Serial.print("Setting PWM to: ");
    Serial.println(pwmValue);
  }
  
  int analogVal = analogRead(ANALOG_PIN);
  
  Serial.print("Reading analog value (0-4095): ");
  Serial.println(analogVal);
  
  delay(100); 
}