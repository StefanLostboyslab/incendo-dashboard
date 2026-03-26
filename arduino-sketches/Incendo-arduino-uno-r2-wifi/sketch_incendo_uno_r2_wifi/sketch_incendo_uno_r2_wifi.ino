#include <Adafruit_GFX.h>
#include <Adafruit_PN532.h>
#include <Adafruit_ST7789.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <WiFiNINA.h>
#include <Wire.h>

#define FIRMWARE_VERSION "1.0.0-R2"

// ---------------- Display pins ----------------
#define TFT_CS 10
#define TFT_RST -1
#define TFT_DC 8
Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_RST);
Adafruit_PN532 nfc(SDA, SCL);

// URI Map explicitly removed to prevent 48KB Flash Linker Overflow

// ---------------- Wi-Fi & MQTT ----------------
const char *ssid = "Skywalker_IoT";
const char *password = "Dubai2026";
const char *mqtt_user = "arduino";
const char *mqtt_pass = "2look@R2D2";
const char *mqtt_server = "192.168.50.65";
const int mqtt_port = 1883;

// ---------------- Hardware Pins ----------------
// Define the pins connected to your physical LEDs and Buttons
const int greenLedPin = 4;
const int redLedPin = 5;
const int BTN_READ = 2;
const int BTN_WRITE = 3;
const int BTN_SET = 0;
const int BTN_WIFI = 1;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// ---------------- Identity & Topics ----------------
String uniqueID, macStr, commandTopic, pingTopic, discoveryTopic, configTopic,
    modeTopic, nfcEventTopic, writeTopic;
String currentMode = "IDLE";
unsigned long nextNfcPoll = 0;
unsigned long lastDiscoveryPing = 0;

struct NdefRecord {
  String type;
  String value;
};
#define MAX_RECORDS 3
NdefRecord targetRecords[MAX_RECORDS];
uint8_t numTargetRecords = 0;

// ---------------- EPCIS Data ----------------
String epcisReadPoint = "";
String epcisBizLocation = "";
String deviceType = "whatt.io incendo NFC";
String dppModelUrl = "";

// ---------------- Hardware Config ----------------
bool hw_pn532 = true;
bool hw_scd30 = false;
bool hw_qrReader = false;
bool pn532_initialized = false;

void generateIdentity() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char buf[30];
  sprintf(buf, "incendo_%02x%02x%02x%02x%02x%02x", mac[0], mac[1], mac[2],
          mac[3], mac[4], mac[5]);
  uniqueID = String(buf);

  char macBuf[20];
  sprintf(macBuf, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2],
          mac[3], mac[4], mac[5]);
  macStr = String(macBuf);
  macStr.toUpperCase();

  // Hardware Defaults (Overridable via Dashboard Config)

  commandTopic = "incendo/dpp_url/" + uniqueID;
  pingTopic = "incendo/devices/" + uniqueID + "/ping";
  discoveryTopic = "incendo/discovery/" + uniqueID;
  configTopic = "incendo/devices/" + uniqueID + "/config";
  modeTopic = "incendo/devices/" + uniqueID + "/mode";
  nfcEventTopic = "incendo/nfc_scan/" + uniqueID;
  writeTopic = "incendo/devices/" + uniqueID + "/write";
}

String getFriendlyReadpoint(String fullUri) {
  if (fullUri.startsWith("whattio:readpoint:")) {
    int slashIndex = fullUri.lastIndexOf('/');
    if (slashIndex != -1 && slashIndex < fullUri.length() - 1) {
      return fullUri.substring(slashIndex + 1);
    }
  }
  return fullUri;
}

void showStatus(String status, uint16_t color) {
  tft.fillScreen(ST77XX_BLACK);

  // Header
  tft.setCursor(0, 10);
  tft.setTextSize(1);
  tft.setTextColor(ST77XX_ORANGE);
  tft.print(F("INCENDO R2 v"));
  tft.print(FIRMWARE_VERSION);
  tft.print(F(" | "));
  tft.setTextColor(color);
  tft.println(status);

  // Big Readpoint / Title
  tft.setCursor(0, 30);
  tft.setTextSize(3); // Jumbo text
  if (epcisReadPoint.length() > 0) {
    tft.setTextColor(ST77XX_CYAN);
    tft.println(getFriendlyReadpoint(epcisReadPoint));
  } else {
    tft.setTextColor(ST77XX_WHITE);
    tft.println(uniqueID);
  }

  tft.drawFastHLine(0, 60, 320, ST77XX_WHITE);

  // Mode Status
  tft.setCursor(0, 75);
  tft.setTextSize(2);
  tft.setTextColor(ST77XX_YELLOW);
  tft.print(F("MODE: "));
  if (currentMode == "READ")
    tft.setTextColor(ST77XX_CYAN);
  else if (currentMode == "WRITE") {
    tft.setTextColor(ST77XX_RED);
    tft.println(F("WRITE"));
    tft.setCursor(0, 150);
    tft.setTextSize(2);
    tft.setTextColor(ST77XX_RED);
    tft.println(F("Waiting for NFC"));
    tft.println(F("tag to burn..."));
    return; // Simplifies the screen to focus on writing
  } else
    tft.setTextColor(ST77XX_WHITE);
  tft.println(currentMode);

  // Connection Info
  tft.setCursor(0, 105);
  tft.setTextSize(2);

  tft.setTextColor(ST77XX_YELLOW);
  tft.print(F("MAC:"));
  tft.setTextColor(ST77XX_WHITE);
  tft.println(macStr);

  tft.setTextColor(ST77XX_YELLOW);
  tft.print(F("ID: "));
  tft.setTextColor(ST77XX_WHITE);
  tft.println(uniqueID);

  tft.setTextColor(ST77XX_YELLOW);
  tft.print(F("IP: "));
  tft.setTextColor(ST77XX_WHITE);
  tft.println(WiFi.localIP());

  tft.println();
  tft.setTextColor(ST77XX_GREEN);
  tft.println(F("LISTENING ON:"));
  tft.setTextColor(ST77XX_WHITE);
  tft.println(modeTopic);
  tft.println(commandTopic);
}

bool programNDEF(NdefRecord* recs, uint8_t recCount, uint8_t *uid = NULL, uint8_t uidLength = 0) {
  // 1. Write to PN532 if initialized
  bool success = false;
  if (hw_pn532 && pn532_initialized) {
    
    // PERFORM ALL NFC WRITES IMMEDIATELY (Do NOT draw TFT here to prevent RF timeout!)
    if (uidLength == 7) {
      // NTAG / Ultralight Custom NDEF Page-by-Page Writer
      uint8_t buffer[256];
      memset(buffer, 0, sizeof(buffer));
      
      uint8_t offset = 0;
      buffer[offset++] = 0x03; // NDEF TLV
      uint8_t lenOffset = offset++; // Placeholder for Length
      
      for (uint8_t i = 0; i < recCount; i++) {
        bool isFirst = (i == 0);
        bool isLast  = (i == recCount - 1);
        uint8_t mb = isFirst ? 0x80 : 0x00;
        uint8_t me = isLast  ? 0x40 : 0x00;
        uint8_t header = mb | me | 0x10 /* SR=1 */ | 0x01 /* TNF=1 */;
        
        if (recs[i].type == "url") {
          String payloadUrl = recs[i].value;
          uint8_t ndefPrefix = 0x00;
          String cleanUrl = payloadUrl;
          if (payloadUrl.startsWith("https://www.")) { ndefPrefix = 0x02; cleanUrl = payloadUrl.substring(12); }
          else if (payloadUrl.startsWith("https://")) { ndefPrefix = 0x04; cleanUrl = payloadUrl.substring(8); }
          else if (payloadUrl.startsWith("http://www.")) { ndefPrefix = 0x01; cleanUrl = payloadUrl.substring(11); }
          else if (payloadUrl.startsWith("http://")) { ndefPrefix = 0x03; cleanUrl = payloadUrl.substring(7); }
          
          buffer[offset++] = header;
          buffer[offset++] = 0x01; // Type Length
          buffer[offset++] = 1 + cleanUrl.length(); // Payload Length
          buffer[offset++] = 0x55; // 'U'
          buffer[offset++] = ndefPrefix;
          for (unsigned int j = 0; j < cleanUrl.length(); j++) {
            buffer[offset++] = cleanUrl[j];
          }
        } 
        else if (recs[i].type == "text" || recs[i].type == "txt") {
          String text = recs[i].value;
          buffer[offset++] = header;
          buffer[offset++] = 0x01; // Type Length
          buffer[offset++] = 3 + text.length(); // Payload Length (1 status + 2 lang en + text)
          buffer[offset++] = 0x54; // 'T'
          buffer[offset++] = 0x02; // Status byte (UTF8, 2 byte lang code)
          buffer[offset++] = 'e';
          buffer[offset++] = 'n';
          for (unsigned int j = 0; j < text.length(); j++) {
            buffer[offset++] = text[j];
          }
        }
      }
      
      uint8_t ndefLen = offset - 2;
      buffer[lenOffset] = ndefLen;
      buffer[offset++] = 0xFE; // Terminator
      
      uint8_t numPages = (offset + 3) / 4;
      
      success = true;
      for (uint8_t i = 0; i < numPages; i++) {
        uint8_t pageData[4];
        pageData[0] = buffer[i*4 + 0];
        pageData[1] = buffer[i*4 + 1];
        pageData[2] = buffer[i*4 + 2];
        pageData[3] = buffer[i*4 + 3];
        
        success = nfc.ntag2xx_WritePage(4 + i, pageData);
        if (!success) {
           Serial.print("Failed writing to NTAG page: ");
           Serial.println(4 + i);
           break;
        }
      }
    } // MIFARE Classic logic surgically removed for memory savings
  }

  // 2. NOW draw the TFT UI safely post-write
  tft.fillScreen(ST77XX_MAGENTA);
  tft.setTextColor(ST77XX_WHITE);
  tft.setCursor(10, 20);
  tft.setTextSize(2);
  tft.println(F("WRITING NDEF..."));
  tft.setCursor(10, 50);
  tft.setTextSize(1);
  if (recCount > 0) tft.println(recs[0].value);
  
  tft.setCursor(10, 80);
  if (success) {
    tft.setTextColor(ST77XX_GREEN);
    tft.setTextSize(2);
    tft.println(F("Writing is DONE!"));
    tft.setTextColor(ST77XX_WHITE);
    tft.setCursor(10, 120);
    tft.println(F("Remove NFC tag!"));
  } else {
    tft.setTextColor(ST77XX_RED);
    tft.println(F("PN532: FAILED"));
  }

  delay(2500);
  return success;
}

// --- FIXED CALLBACK LOGIC ---
void onMqttMessage(char *topic, byte *payload, unsigned int length) {
  String topicStr = String(topic);
  Serial.print("Incoming Topic: ");
  Serial.println(topicStr);

  // 1. Handle Ping Logic
  if (topicStr.endsWith("/ping")) {
    String pongTopic = topicStr;
    pongTopic.replace("/ping", "/pong");
    mqtt.publish(pongTopic.c_str(), payload, length);

    // Update Display
    tft.fillScreen(ST77XX_BLACK);
    tft.setCursor(0, 20);
    tft.setTextColor(ST77XX_GREEN);
    tft.setTextSize(3);
    tft.println("PING");
    tft.println("RECEIVED!");
    tft.setTextSize(1);
    tft.setCursor(0, 80);
    tft.setTextColor(ST77XX_WHITE);
    tft.println(topicStr);

    // Flash Green and Red LEDs intensively 3 times
    for (int i = 0; i < 3; i++) {
      digitalWrite(greenLedPin, HIGH);
      digitalWrite(redLedPin, LOW);
      delay(150);
      digitalWrite(greenLedPin, LOW);
      digitalWrite(redLedPin, HIGH);
      delay(150);
    }
    // Turn both off
    digitalWrite(greenLedPin, LOW);
    digitalWrite(redLedPin, LOW);

    return; // Exit immediately
  }

  // 2. Handle URL/Command Logic
  else if (topicStr == commandTopic) {
    String receivedURL = "";
    for (unsigned int i = 0; i < length; i++)
      receivedURL += (char)payload[i];

    Serial.println("Received write command via dpp_url: " + receivedURL);
    NdefRecord singleRec;
    singleRec.type = "url";
    singleRec.value = receivedURL;
    programNDEF(&singleRec, 1, NULL, 0);
    showStatus(currentMode == "IDLE" ? "ONLINE" : currentMode, ST77XX_GREEN);
  }

  // 3. Handle Config/EPCIS Update
  else if (topicStr == configTopic) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload, length);

    if (!error) {
      if (doc.containsKey("readPoint"))
        epcisReadPoint = doc["readPoint"].as<String>();
      if (doc.containsKey("bizLocation"))
        epcisBizLocation = doc["bizLocation"].as<String>();
      if (doc.containsKey("deviceType"))
        deviceType = doc["deviceType"].as<String>();
      if (doc.containsKey("sgtin"))
        dppModelUrl = doc["sgtin"].as<String>();

      if (doc.containsKey("hardwareModules")) {
        JsonObject hw = doc["hardwareModules"];
        if (hw.containsKey("pn532"))
          hw_pn532 = hw["pn532"].as<bool>();
        if (hw.containsKey("scd30"))
          hw_scd30 = hw["scd30"].as<bool>();
        if (hw.containsKey("qrReader"))
          hw_qrReader = hw["qrReader"].as<bool>();

        // If PN532 is enabled but not initialized, try to initialize it now
        if (hw_pn532 && !pn532_initialized) {
          nfc.begin();
          uint32_t versiondata = nfc.getFirmwareVersion();
          if (versiondata) {
            nfc.SAMConfig();
            pn532_initialized = true;
            Serial.println("PN532 initialized from config update.");
          } else {
            Serial.println(
                "Warning: Config requested PN532 but initialization failed.");
          }
        }
      }

      Serial.println("EPCIS Config Updated");
      // Re-send discovery packet immediately so dashboard has right EPCIS
      // metadata
      sendDiscovery();

      tft.fillScreen(ST77XX_BLACK);
      tft.setCursor(0, 20);
      tft.setTextColor(ST77XX_CYAN);
      tft.setTextSize(2);
      tft.println(F("CONFIG"));
      tft.println(F("SAVED!"));

      tft.setTextSize(1);
      tft.setCursor(0, 80);
      tft.setTextColor(ST77XX_YELLOW);
      tft.print(F("ReadPoint: "));
      tft.setTextColor(ST77XX_WHITE);
      tft.println(epcisReadPoint);

      tft.setTextColor(ST77XX_YELLOW);
      tft.print(F("Type: "));
      tft.setTextColor(ST77XX_WHITE);
      tft.println(deviceType);

      delay(2000);
      showStatus(currentMode == "IDLE" ? "ONLINE" : currentMode, ST77XX_GREEN);
    } else {
      Serial.println("Failed to parse config JSON");
    }
  }

  // 4. Handle Mode Update
  else if (topicStr == modeTopic) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload, length);

    if (!error) {
      if (doc.containsKey("mode"))
        currentMode = doc["mode"].as<String>();
      
      if (doc.containsKey("records")) {
        JsonArray records = doc["records"].as<JsonArray>();
        numTargetRecords = 0;
        for (JsonVariant v : records) {
          if (numTargetRecords < MAX_RECORDS) {
            targetRecords[numTargetRecords].type = v["type"].as<String>();
            targetRecords[numTargetRecords].value = v["value"].as<String>();
            numTargetRecords++;
          }
        }
      }

      Serial.println("Mode updated to: " + currentMode);
      showStatus("ONLINE", ST77XX_GREEN); // Redraw with new mode

      // LED Feedback
      if (currentMode == "READ") {
        digitalWrite(greenLedPin, HIGH);
        digitalWrite(redLedPin, LOW);
      } else if (currentMode == "WRITE" || currentMode == "WRITE_UNIT") {
        digitalWrite(greenLedPin, LOW);
        digitalWrite(redLedPin, HIGH);
      } else {
        digitalWrite(greenLedPin, LOW);
        digitalWrite(redLedPin, LOW);
      }
    } else {
      Serial.println("Failed to parse mode JSON");
    }
  }

  // 5. Handle OTA Update (REMOVED FOR SRAM/PROGMEM LIMITATIONS)

  // 6. Config Topic (Removed Simulated ST25DV EEPROM writes as requested)
}

void sendDiscovery() {
  JsonDocument doc;
  doc["id"] = uniqueID;
  IPAddress ip = WiFi.localIP();
  doc["ip"] = String(ip[0]) + "." + String(ip[1]) + "." + String(ip[2]) + "." + String(ip[3]);
  doc["mac"] = macStr;

  // ESPR Compliant Unit Level URL Generation
  String unitDppUrl = "https://whatt.io/" + uniqueID; // Fallback
  if (dppModelUrl.length() > 0) {
    int lastSlash = dppModelUrl.lastIndexOf('/');
    String productId = dppModelUrl;
    if (lastSlash != -1) {
      productId = dppModelUrl.substring(lastSlash + 1);
    }
    int qMark = productId.indexOf('?');
    if (qMark != -1)
      productId = productId.substring(0, qMark);

    int dashIndex = productId.lastIndexOf('-');
    if (dashIndex != -1 && dashIndex < productId.length() - 1) {
      String potentialNumber = productId.substring(dashIndex + 1);
      bool isNum = true;
      for (unsigned int i = 0; i < potentialNumber.length(); i++) {
        if (!isDigit(potentialNumber[i])) {
          isNum = false;
          break;
        }
      }
      if (isNum)
        productId = potentialNumber;
    }
    if (productId.length() > 0) {
      unitDppUrl = "https://whatt.io/" + productId + "/" + macStr;
    }
  }
  doc["dpp_url"] = unitDppUrl;
  doc["version"] = FIRMWARE_VERSION;

  // EPCIS payload format expected by Dashboard
  JsonObject epcis = doc["epcis"].to<JsonObject>();

  JsonObject readPoint = epcis["readPoint"].to<JsonObject>();
  readPoint["id"] = epcisReadPoint;

  JsonObject bizLocation = epcis["bizLocation"].to<JsonObject>();
  bizLocation["id"] = epcisBizLocation;

  JsonObject ilmd = epcis["ilmd"].to<JsonObject>();
  ilmd["deviceType"] = deviceType;
  ilmd["firmwareVersion"] = FIRMWARE_VERSION;

  JsonObject extension = epcis["extension"].to<JsonObject>();
  extension["whattio:fabricatedUnitSerial"] = macStr;

  JsonObject hwMods = doc["hardwareModules"].to<JsonObject>();
  hwMods["pn532"] = hw_pn532;
  hwMods["scd30"] = hw_scd30;
  hwMods["qrReader"] = hw_qrReader;

  char buffer[768]; // Increased buffer size to fit nested json payload
  serializeJson(doc, buffer);
  mqtt.publish(discoveryTopic.c_str(), buffer, true);
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(greenLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);

  pinMode(BTN_READ, INPUT_PULLUP);
  pinMode(BTN_WRITE, INPUT_PULLUP);
  pinMode(BTN_SET, INPUT_PULLUP);
  pinMode(BTN_WIFI, INPUT_PULLUP);
  Serial.begin(115200);
  tft.init(240, 320);
  tft.setRotation(1);
  tft.fillScreen(ST77XX_BLACK);

  Wire.begin();

  // Pivot hardware depending on physical MAC read
  generateIdentity();

  // ST25DV I2C Logic fully disabled for megaAVR macro compatibility
  if (hw_pn532) {
    nfc.begin();
    uint32_t versiondata = nfc.getFirmwareVersion();
    if (!versiondata) {
      Serial.println(
          F("Warning: PN532 not found during setup check. Continuing anyway."));
      pn532_initialized = false;
      // Visual warning, but do not block system
      tft.fillScreen(ST77XX_RED);
      tft.setCursor(10, 100);
      tft.setTextColor(ST77XX_WHITE);
      tft.setTextSize(2);
      tft.println(F("NFC NOT FOUND"));
      tft.setTextSize(1);
      tft.setCursor(10, 140);
      tft.println(F("Will retry if conf updated"));
      delay(2000);
    } else {
      Serial.print(F("Found PN532 chip: PN5"));
      Serial.println((versiondata >> 24) & 0xFF, HEX);
      nfc.SAMConfig();
      pn532_initialized = true;
    }
  }
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setCallback(onMqttMessage);

  // CRITICAL FIX: The default PubSubClient buffer is 256 bytes.
  // Our new nested EPCIS JSON telemetry is ~426 bytes. We MUST increase the
  // network buffer!
  mqtt.setBufferSize(1024);

  reconnectMQTT();
}

void reconnectMQTT() {
  while (!mqtt.connected()) {
    showStatus("OFFLINE", ST77XX_RED);
    if (mqtt.connect(uniqueID.c_str(), mqtt_user, mqtt_pass)) {
      sendDiscovery();
      mqtt.subscribe(commandTopic.c_str());
      mqtt.subscribe(pingTopic.c_str());
      mqtt.subscribe(configTopic.c_str());
      mqtt.subscribe(modeTopic.c_str());
      mqtt.subscribe(writeTopic.c_str());
      showStatus("ONLINE", ST77XX_GREEN);
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!mqtt.connected())
    reconnectMQTT();
  mqtt.loop();

  // Hardware Interface - State Machine Buttons
  if (digitalRead(BTN_READ) == LOW) {
    if (currentMode != "READ") {
      currentMode = "READ";
      showStatus("ONLINE", ST77XX_GREEN);
      digitalWrite(greenLedPin, HIGH);
      digitalWrite(redLedPin, LOW);
      Serial.println("Mode changed to READ via button");
      delay(300); // Debounce
    }
  } else if (digitalRead(BTN_WRITE) == LOW) {
    if (currentMode != "WRITE") {
      currentMode = "WRITE";
      showStatus("ONLINE", ST77XX_GREEN);
      digitalWrite(greenLedPin, LOW);
      digitalWrite(redLedPin, HIGH);
      Serial.println("Mode changed to WRITE via button");
      delay(300); // Debounce
    }
  } else if (digitalRead(BTN_SET) == LOW) {
    if (currentMode != "IDLE") {
      currentMode = "IDLE";
      showStatus("ONLINE", ST77XX_GREEN);
      digitalWrite(greenLedPin, LOW);
      digitalWrite(redLedPin, LOW);
      Serial.println("Mode changed to IDLE via button");
      delay(300); // Debounce
    }
  }

  // Periodically send discovery ping so dashboard knows device is ONLINE
  if (millis() - lastDiscoveryPing > 10000) {
    lastDiscoveryPing = millis();
    sendDiscovery();
  }

  if ((currentMode == "WRITE" || currentMode == "WRITE_UNIT") && hw_pn532 && pn532_initialized && millis() > nextNfcPoll) {
    nextNfcPoll = millis() + 300; // Fast poll for writing
    uint8_t uid[] = {0, 0, 0, 0, 0, 0, 0};
    uint8_t uidLength;

    if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 50)) {
      nextNfcPoll = millis() + 2000;
      
      if (numTargetRecords > 0) {
        bool wroteOk = programNDEF(targetRecords, numTargetRecords, uid, uidLength);
        if (wroteOk) {
          // Send a webhook trigger to the dashboard that a tag was burned
          if (currentMode == "WRITE_UNIT") {
            mqtt.publish(nfcEventTopic.c_str(), "{\"uid\":\"UNIT_WRITE_OK\"}");
            currentMode = "IDLE"; // Drop out of write loop instantly for Unit
          } else {
            mqtt.publish(nfcEventTopic.c_str(), "{\"uid\":\"BATCH_WRITE_OK\"}");
          }
        }
      }
      
      delay(1500); // Visual pause so user sees SUCCESS
      showStatus("ONLINE", ST77XX_GREEN);
      digitalWrite(greenLedPin, LOW);
      digitalWrite(redLedPin, HIGH);
    }
  }

  if (currentMode == "READ" && hw_pn532 && pn532_initialized &&
      millis() > nextNfcPoll) {
    nextNfcPoll = millis() + 500; // Default poll interval
    uint8_t uid[] = {0, 0, 0, 0, 0, 0, 0};
    uint8_t uidLength;

    // Non-blocking read (50ms timeout)
    if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 50)) {
      // Add a 2 second debounce after a successful read so it doesn't spam the
      // dashboard with multiple scans while the user finishes moving the tag
      // away
      nextNfcPoll = millis() + 2000;

      String uidStr = "";
      for (uint8_t i = 0; i < uidLength; i++) {
        if (uid[i] < 0x10)
          uidStr += "0";
        uidStr += String(uid[i], HEX);
        if (i < uidLength - 1)
          uidStr += ":";
      }
      uidStr.toUpperCase();

      // --- Read NTAG Pages 4-15 for NDEF Records ---
      uint8_t data[16];
      String record1 = "";   // URL
      String record2 = "";   // Token
      String record3 = "";   // Blockchain
      int currentRecord = 0; // 0=none, 1=URL, 2=Token, 3=bc

      uint8_t prefixByte = 0;

      for (int page = 4; page <= 15; page++) {
        if (!nfc.ntag2xx_ReadPage(page, data))
          continue;

        bool ndefEnded = false;
        for (int i = 0; i < 4; i++) {
          uint8_t b = data[i];
          if (b == 0x55 && currentRecord == 0) {
            currentRecord = 1;
            prefixByte = data[i + 1];
            i += 1;
            continue;
          }
          if (b == 0x54) {
            if (currentRecord == 1 || currentRecord == 0)
              currentRecord = 2;
            else if (currentRecord == 2)
              currentRecord = 3;
            i += 2;
            continue;
          }
          if (b == 0xFE || b == 0x00) {
            ndefEnded = true;
            break;
          }
          if (b >= 0x20 && b <= 0x7E) {
            if (currentRecord == 1)
              record1 += (char)b;
            else if (currentRecord == 2)
              record2 += (char)b;
            else if (currentRecord == 3)
              record3 += (char)b;
          }
        }
        if (ndefEnded)
          break;
      }

      String fullUrl = "";
      if (prefixByte == 0x01) fullUrl = String(F("http://www.")) + record1;
      else if (prefixByte == 0x02) fullUrl = String(F("https://www.")) + record1;
      else if (prefixByte == 0x03) fullUrl = String(F("http://")) + record1;
      else if (prefixByte == 0x04) fullUrl = String(F("https://")) + record1;
      else fullUrl = record1;

      // Update screen
      tft.fillScreen(ST77XX_GREEN);
      tft.setTextColor(ST77XX_BLACK);
      tft.setCursor(10, 20);
      tft.setTextSize(3);
      tft.println("TAG DETECTED");

      tft.setCursor(10, 60);
      tft.setTextSize(2);
      tft.println(uidStr);

      tft.setTextSize(1);
      if (fullUrl.length() > 0) {
        tft.setCursor(10, 90);
        tft.setTextColor(ST77XX_BLUE);
        tft.print("URL: ");
        tft.setTextColor(ST77XX_BLACK);
        tft.println(fullUrl);
      }
      if (record2.length() > 0) {
        tft.setCursor(10, 130);
        tft.setTextColor(ST77XX_BLUE);
        tft.print("Token: ");
        tft.setTextColor(ST77XX_BLACK);
        tft.println(record2);
      }
      if (record3.length() > 0 && record3.indexOf("bc:anchored") != -1) {
        tft.setCursor(10, 160);
        tft.setTextColor(ST77XX_MAGENTA);
        tft.print("CHAIN: ");
        tft.setTextColor(ST77XX_BLACK);
        tft.println("ANCHORED");
      }

      // Publish event
      JsonDocument eventDoc;
      eventDoc["uid"] = uidStr;
      eventDoc["readPoint"] = epcisReadPoint;
      if (fullUrl.length() > 0)
        eventDoc["dpp_url"] = fullUrl;
      if (record2.length() > 0)
        eventDoc["token"] = record2;
      if (record3.length() > 0 && record3.indexOf("bc:anchored") != -1)
        eventDoc["blockchainConnected"] = true;

      char buffer[512];
      serializeJson(eventDoc, buffer);
      mqtt.publish(nfcEventTopic.c_str(), buffer);

      delay(1500);                        // Visual pause
      showStatus("ONLINE", ST77XX_GREEN); // Restore UI

      // Restore LEDs
      digitalWrite(greenLedPin, HIGH);
      digitalWrite(redLedPin, LOW);
    }
  }
}
