#include "current_sensor.h"
#include <Arduino.h>

CurrentSensor::CurrentSensor(int sensorPin, float sens, float zero) {
    pin = sensorPin;
    sensitivity = sens;
    zeroPoint = zero;
    pinMode(pin, INPUT);
}

float CurrentSensor::read() {
    float raw = readRaw();
    const float ADC_MAX = 4095.0f;
    const float VREF = 3.3f;
    // convert to voltage then to current
    float voltage = (raw / ADC_MAX) * VREF;
    float current = (voltage - zeroPoint) / sensitivity;
    return current;
}

float CurrentSensor::readRaw() {
    return static_cast<float>(analogRead(pin));
}

void CurrentSensor::calibrate() {
    // average 100 readings to find zero point
    float sum = 0;
    for (int i = 0; i < 100; i++) {
        sum += analogRead(pin);
        delay(1);
    }
    float avg = sum / 100.0f;
    const float ADC_MAX = 4095.0f;
    const float VREF = 3.3f;
    zeroPoint = (avg / ADC_MAX) * VREF;
}
