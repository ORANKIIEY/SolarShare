#include "voltage_sensor.h"
#include <Arduino.h>

VoltageSensor::VoltageSensor(int sensorPin, float ratio) {
    pin = sensorPin;
    dividerRatio = ratio;
    pinMode(pin, INPUT);
}

float VoltageSensor::read() {
    float raw = readRaw();
    const float ADC_MAX = 4095.0f;
    const float VREF = 3.3f;
    // apply voltage divider ratio
    float voltage = (raw / ADC_MAX) * VREF * dividerRatio;
    return voltage;
}

float VoltageSensor::readRaw() {
    return static_cast<float>(analogRead(pin));
}
