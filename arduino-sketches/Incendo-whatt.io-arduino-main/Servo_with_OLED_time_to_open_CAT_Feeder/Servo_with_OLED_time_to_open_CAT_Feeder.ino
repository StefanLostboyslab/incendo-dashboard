#include <Servo.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define LED_PIN 7
#define SERVO_PIN 8
#define BUTTON_PIN 3
#define COUNTDOWN_TIME 65000  // 65 seconds in milliseconds for
 testing
#define SERVO_OPEN_ANGLE 90
#define SERVO_CLOSED_ANGLE 0

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
Servo servo;
unsigned long timer;
bool isServoOpen = false;

void setup() {
  Serial.begin(9600);
  if (!display.begin(-1, 0x3C)) {
    Serial.println("Failed to initialize OLED display");
    while (1);
  }
  display.clearDisplay();

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  servo.attach(SERVO_PIN);
  servo.write(SERVO_CLOSED_ANGLE);  // Start with the servo in the closed position
  digitalWrite(LED_PIN, LOW);       // Start with the LED off
  
  timer = millis() + COUNTDOWN_TIME;
}

void loop() {
  unsigned long currentMillis = millis();
  long remainingTime = timer - currentMillis;

  if (digitalRead(BUTTON_PIN) == LOW) {
    // Button pressed, reset timer and close servo
    timer = currentMillis + COUNTDOWN_TIME;
    if (isServoOpen) {
      digitalWrite(LED_PIN, LOW);
      servo.write(SERVO_CLOSED_ANGLE);
      isServoOpen = false;
    }
  }

  if (remainingTime <= 0 && !isServoOpen) {
    // Time's up, open the servo
    digitalWrite(LED_PIN, HIGH);
    servo.write(SERVO_OPEN_ANGLE);
    isServoOpen = true;
  }

  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  
  // Calculate remaining hours, minutes and seconds
  long remainingSeconds = max(0, remainingTime) / 1000;
  int hours = remainingSeconds / 3600;
  int minutes = (remainingSeconds % 3600) / 60;
  int seconds = remainingSeconds % 60;

  display.print("Food open:");
  display.print(hours);
  display.print(":");
  if (minutes < 10) display.print('0');  // Leading zero for minutes
  display.print(minutes);
  display.print(":");
  if (seconds < 10) display.print('0');  // Leading zero for seconds
  display.print(seconds);


  display.print("   Status:   ");
  display.print(isServoOpen ? "OPEN" : "CLOSED");
  display.display();

  delay(100);
}
