#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels


#define LED_PIN 7
#define BUTTON_PIN 3
#define DHTPIN 2       // Digital pin for connecting the DHT sensor
#define DHTTYPE DHT22  // DHT 22 (AM2302)

// Initialize the OLED display using Arduino Wire:
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Initialize DHT sensor.
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  // Start the OLED display
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.display();
  delay(2000); // Pause for 2 seconds

  // Set pin modes
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Start the DHT sensor
  dht.begin();
}

void loop() {
  // Read humidity and temperature values
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // Check if any reads failed and exit early (to try again).
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println(F("Failed to read from DHT sensor!"));
    return;
  }

  // Clear the display buffer.
  display.clearDisplay();
  display.setTextSize(1);      // Normal 1:1 pixel scale
  display.setTextColor(SSD1306_WHITE); // Draw white text
  display.setCursor(0,0);     // Start at top-left corner

  // Display the temperature and humidity
  display.print(F("Temp: "));
  display.print(temperature);
  display.println(F("C"));

  display.print(F("Humidity: "));
  display.print(humidity);
  display.println(F("%"));

  // Update the display with all of the above graphics
  display.display();

  delay(2000); // Wait a few seconds between measurements
}
