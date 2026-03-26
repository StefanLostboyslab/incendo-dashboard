#include <Ynvisible_Driver_4.2-1.0.0.h>

// Constants for NTC thermistor
const int analogPin = A0; // The analog pin the thermistor is connected to
const double A = 0.001129148;
const double B = 0.000234125;
const double C = 0.0000000876741;
const float referenceResistor = 100000; // Match to your series resistor value

// Display settings
int i2c_address = 43; // The i2c address of driver board 4.1
int number_of_segments = 15; // Number of segments on display (1-15)
YNV_ECD ECD(i2c_address, number_of_segments); // ECD Object

void setup() {
  Serial.begin(9600);
  // Add other setup code for the Ynvisible display if necessary
}


void loop() {


  int analogValue = analogRead(analogPin);
  
  // Prevent division by zero if the thermistor is disconnected
  if (analogValue == 0) {
    Serial.println("Check thermistor connection!");
  } else {
    double resistance = referenceResistor / ((1024.0 / analogValue) - 1);

    Serial.print("Resistance: ");
    Serial.println(resistance);

    double steinhart = A + (B * log(resistance)) + (C * pow(log(resistance), 3));
    steinhart = 1.0 / steinhart;
    steinhart -= 273.15; // Convert to Celsius
    
    // Round to the nearest integer
    int temperature = round(steinhart);
    
    // Constrain the temperature to the range the display can show
    temperature = constrain(temperature, -99, 99);
    
    Serial.print("Temperature (rounded): ");
    Serial.println(temperature);

    // Display the temperature on the Ynvisible display
    ECD.setNumber2x7(temperature);
    delay(1000);
    ECD.refresh(); // Refresh to show the new value
  }
  delay(1000); // Delay between readings
}
