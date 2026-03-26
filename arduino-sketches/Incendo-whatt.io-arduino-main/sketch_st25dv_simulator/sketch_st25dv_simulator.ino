#include <SPI.h>
#include <WiFiS3.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <SparkFun_ST25DV64KC_Arduino_Library.h>
#include <OTAUpdate.h>

#define FIRMWARE_VERSION "1.72"
OTAUpdate ota;

SFE_ST25DV64KC st25dv;

const char* ssid     = "Skywalker_IoT";
const char* password = "Dubai2026";
const char* mqtt_user = "arduino";
const char* mqtt_pass = "2look@R2D2";
const char* mqtt_server = "192.168.50.65";
const int   mqtt_port   = 1883;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
unsigned long lastDiscoveryPing = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Power up I2C bus explicitly
  Wire.begin();
  
  // Initialize EEPROM
  if (!st25dv.begin(Wire)) {
    Serial.println("Could not find a valid ST25DV sensor via SparkFun lib, check wiring!");
    while (1) delay(10);
  }
  Serial.println("SparkFun ST25DV found!");

  // Initialize WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected.");
  
  // Connect MQTT
  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setCallback(mqttCallback);
}

void reconnect() {
  while (!mqtt.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    // Create random client ID
    String clientId = "IncendoClient-ST25DV-";
    clientId += String(random(0xffff), HEX);
    
    if (mqtt.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("connected");
      // Subscribe to WRITE events on this specific device
      // Replace bjarred/eeprom_right_wing with actual unit string, or generically: 
      mqtt.subscribe("incendo/devices/bjarred/eeprom_right_wing/write");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  if (String(topic).endsWith("/write")) {
    Serial.println("Received WRITE command over MQTT.");
    
    // Write URL into ST25DV EEPROM memory as NDEF record
    if(message.startsWith("http")) {
      // Basic implementation for writing a raw string (NDEF logic can be expanded)
      // st25dv.writeNDEF_URL(message.c_str()); (if lib supports it directly)
      Serial.println("Flashing NDEF URL: " + message);
      
      uint8_t uri_data[256];
      memset(uri_data, 0, 256);
      message.getBytes(uri_data, 256);
      
      // Realistically you should write an NDEF header block, etc.
      // But for simulated functionality, this acknowledges the receipt visually!
      Serial.println("NDEF Simulation Complete.");
    }
  }
}

void loop() {
  if (!mqtt.connected()) {
    reconnect();
  }
  mqtt.loop();
  
  // Periodically send discovery pings
  unsigned long now = millis();
  if (now - lastDiscoveryPing > 10000) {
    lastDiscoveryPing = now;
    
    StaticJsonDocument<512> doc;
    doc["id"] = "bjarred/eeprom_right_wing";
    doc["name"] = "NFC Right Wing";
    doc["type"] = "incendo_st25dv_simulator";
    doc["ip"] = WiFi.localIP().toString();
    doc["mac"] = "AA:BB:CC:DD:EE:FF";
    doc["dpp_url"] = "https://whatt.io/2094/AA:BB:CC:DD:EE:FF";
    
    char buffer[512];
    serializeJson(doc, buffer);
    mqtt.publish("incendo/discovery/bjarred_eeprom_right_wing", buffer);
  }
}
