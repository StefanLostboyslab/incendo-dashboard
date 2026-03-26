#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define RST_PIN         9          // Configurable, see typical pin layout above
#define SS_PIN          10         // Configurable, see typical pin layout above
MFRC522 mfrc522(SS_PIN, RST_PIN);  // Create MFRC522 instance

#define OLED_RESET      -1         // Reset pin # (or -1 if sharing Arduino reset pin)
Adafruit_SSD1306 display(128, 64, &Wire, OLED_RESET);

void setup() {
  Serial.begin(9600);             // Initialize serial communications with the PC
  while (!Serial);                // Do nothing if no serial port is opened
  SPI.begin();                    // Init SPI bus
  mfrc522.PCD_Init();             // Init MFRC522
  mfrc522.PCD_DumpVersionToSerial();  // Show details of PCD - MFRC522 Card Reader details
  Serial.println(F("Scan PICC to see UID, SAK, type, and data blocks..."));

  // SSD1306_SWITCHCAPVCC = generate display voltage from 3.3V internally
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { // Address 0x3C for 128x64
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Don't proceed, loop forever
  }
  display.display();
  delay(2000); // Pause for 2 seconds
  display.clearDisplay();
  display.setTextSize(1);      // Normal 1:1 pixel scale
  display.setTextColor(SSD1306_WHITE); // Draw white text
  display.setCursor(0,0);      // Start at top-left corner
  display.print(F("Scan a card..."));
  display.display();
}

void loop() {
  if ( ! mfrc522.PICC_IsNewCardPresent() || ! mfrc522.PICC_ReadCardSerial() ) {
    delay(50); // If no card present, re-check after a short pause
    return;
  }

  // Clear the display
  display.clearDisplay();
  display.setCursor(0,0);

  // Dump debug info about the card; PICC_HaltA() is automatically called
  display.print(F("Card UID:"));
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if(mfrc522.uid.uidByte[i] < 0x10)
      display.print(F(" 0"));
    else
      display.print(F(" "));
    display.print(mfrc522.uid.uidByte[i], HEX);
  }
  
  display.display(); // Display our text
  mfrc522.PICC_DumpToSerial(&(mfrc522.uid)); // Also dump to serial
}
