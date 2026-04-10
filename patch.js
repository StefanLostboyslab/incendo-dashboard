const fs = require('fs');

const content = fs.readFileSync('src/components/DeviceDetail.tsx', 'utf8');

const old_block = `                                        const fullPrompt = \`Here is my exact hardware configuration:
- Motherboard: \${mb}
- Display: \${disp}
- I2C Peripherals: \${i2c.length > 0 ? i2c.join(', ') : 'None'}

Use the following fundamental C++ boilerplate as the base layout structure, and smartly inject additional #include statements, libraries, and logic to support the specific hardware modules listed above:

\\\`\\\`\\\`cpp
#include <Adafruit_GFX.h>
\${disp !== 'None' && disp !== 'SSD1306' ? \`#include <Adafruit_\${disp}.h>\\n\` : ''}\${device.hardwareModules?.pn532 ? '#include <Adafruit_PN532.h>\\n' : ''}#include <SPI.h>
#include <WiFiS3.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <OTAUpdate.h>

#define FIRMWARE_VERSION "1.61"
OTAUpdate ota;

\${disp !== 'None' && disp !== 'SSD1306' ? \`// ---------------- Display pins ----------------
#define TFT_CS     10
#define TFT_RST    -1
#define TFT_DC      8
Adafruit_\${disp} tft = Adafruit_\${disp}(TFT_CS, TFT_DC, TFT_RST);
\` : ''}
\${device.hardwareModules?.pn532 ? \`// ---------------- NFC Module ----------------
Adafruit_PN532 nfc(SDA, SCL);
\` : ''}
// NFC URI Prefix Map
const char* URI_PREFIX_MAP[] = {
  "", "http://www.", "https://www.", "http://", "https://", "tel:",
  "mailto:", "ftp://anonymous:anonymous@", "ftp://ftp.", "ftps://",
  "sftp://", "smb://", "nfs://", "ftp://", "dav://", "news:", "telnet://",
  "imap:", "rtsp://", "urn:", "pop:", "sip:", "sips:", "tftp:", "btspp://",
  "btl2cap://", "btgoep://", "tcpobex://", "irdaobex://", "file://",
  "urn:epc:id:", "urn:epc:tag:", "urn:epc:pat:", "urn:epc:raw:",
  "urn:epc:", "urn:nfc:"
};

// ---------------- Wi-Fi & MQTT ----------------
const char* ssid     = "Skywalker_IoT";
const char* password = "Dubai2026";
const char* mqtt_user = "arduino";
const char* mqtt_pass = "2look@R2D2";
const char* mqtt_server = "192.168.50.65";
const int   mqtt_port   = 1883;

// ---------------- Hardware Pins ----------------
const int greenLedPin = 4;
const int redLedPin = 5;
const int BTN_READ = 2;
const int BTN_WRITE = 3;
const int BTN_SET = 0;
const int BTN_WIFI = 1;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

void setup() {
  Serial.begin(115200);
  // Optional: setup logic here...
}

void loop() {
  // Custom loop logic...
}
\\\`\\\`\\\`

Generate the complete \\\`setup()\\\` and \\\`loop()\\\` routines integrating these components perfectly so they can be securely flashed onto the unit.\`;`;

const new_block = `                                        let displayFlag = 'DISPLAY_ST7789'; // default
                                        if (disp === 'SSD1306') displayFlag = 'DISPLAY_SSD1306';
                                        else if (disp === 'ST7735') displayFlag = 'DISPLAY_ST7735';
                                        else if (disp === 'None') displayFlag = 'DISPLAY_NONE';

                                        const fullPrompt = \`/* 
 * INCENDO HARDWARE CONFIGURATION
 * Simply copy and replace the top section of your sketch_incendo_universal.ino
 * with this exact block so it matches your physical hardware!
 */

// ==========================================
// HARDWARE DISPLAY CONFIGURATION
// ==========================================
#define \${displayFlag}
// ==========================================
\`;`;

let newContent = content;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedOldBlock = old_block.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedOldBlock)) {
    newContent = normalizedContent.replace(normalizedOldBlock, new_block);
    
    newContent = newContent.replace('Click "COPY PROMPT" to grab the dynamically generated C++ layout string for this configuration.', 'Click "COPY PROMPT" to copy the exact configuration block needed at the top of your sketch.');
    
    fs.writeFileSync('src/components/DeviceDetail.tsx', newContent, 'utf8');
    console.log("Successfully replaced block!");
} else {
    console.log("Could not find the exact old_block string match :(");
}
