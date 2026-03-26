#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128  // OLED display width, in pixels
#define SCREEN_HEIGHT 64  // OLED display height, in pixels
// Define LED pin
const int ledPin = 13; 

// Declaration for an SSD1306 display connected to I2C (SDA, SCL pins)All
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire);

// Button configuration
const int buttonPin = 2;     // Change this to whatever pin your button is connected to
int lastButtonState = LOW;   // the previous state of the button

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);   // Configure the button pin as input with pullup resistor

  // Initialize I2C and the OLED display with the address 0x3C. Modify this if your OLED has a different address.
  if (!display.begin(-1, 0x3C)) {
    Serial.println("Failed to initialize OLED display");
    while (1);
  }

  initialDisplay();
}

void loop() {
  int buttonState = digitalRead(buttonPin);
  
  if (buttonState == LOW && lastButtonState == HIGH) {  // Button is pressed (Assuming the button is active LOW)
    displaySequence();
  } 
  else if (buttonState == HIGH && lastButtonState == LOW) {  // Button is released
    initialDisplay();
  }

  lastButtonState = buttonState;
}

void displaySequence() {
  digitalWrite(ledPin, HIGH);   // Turn the LED on
  const char* messages[] = {
    "WRITING TO NFC CHIP",
    "Adding whatt.io URL",
    "Adding whatt.io TOKEN",
    "LOCKING CHIP",
    "DONE - Release Button"
  };

  for (int i = 0; i < sizeof(messages) / sizeof(messages[0]); i++) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 30); // Adjust the y-position to center text
    display.print(messages[i]);
    display.display();
    delay(1000); // Pause for 0.3 seconds
  }
}

void initialDisplay() {
   digitalWrite(ledPin, LOW);    // Turn the LED off
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print("whatt.io WRITE MODE  ");
  display.print("- - - - - - - - - - ");
  display.print(" Prod.Nr. PROD0481    ");
  display.print("                     ");
  display.print("LITHIUM ONE Speaker  with binding posts   ");
  display.print("                     ");
  display.print("PRESS TO WRITE TO NFC");
  display.display();
}
