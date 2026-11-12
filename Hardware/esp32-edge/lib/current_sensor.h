#ifndef CURRENT_SENSOR_H
#define CURRENT_SENSOR_H

// driver for ACS712 current sensor
class CurrentSensor {
private:
    int pin;
    float sensitivity;  // mV per A
    float zeroPoint;    // zero current voltage

public:
    CurrentSensor(int sensorPin, float sens = 0.066f, float zero = 1.65f);
    float read();      // returns amps
    float readRaw();   // returns ADC value
    void calibrate();  // find zero point
};

#endif
