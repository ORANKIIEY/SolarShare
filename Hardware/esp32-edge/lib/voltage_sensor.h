#ifndef VOLTAGE_SENSOR_H
#define VOLTAGE_SENSOR_H

// voltage divider sensor driver
class VoltageSensor {
private:
    int pin;
    float dividerRatio;  // input/output ratio

public:
    VoltageSensor(int sensorPin, float ratio = 100.0f);
    float read();     // returns voltage
    float readRaw();  // returns ADC value
};

#endif
