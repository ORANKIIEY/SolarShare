#ifndef EDGE_SERVICE_H
#define EDGE_SERVICE_H

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "circular_buffer.h"

// wifi and mqtt config - change these!
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_SERVER = "your-mqtt-broker.com";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "gridguard-pole-001";
const char* MQTT_TOPIC = "grid/pole/telemetry";

// hardware pins
const int CURRENT_SENSOR_PIN = 34;
const int VOLTAGE_SENSOR_PIN = 35;

// sampling config
const int SAMPLE_RATE_HZ = 1000;
const int SAMPLE_INTERVAL_US = 1000000 / SAMPLE_RATE_HZ;
const float THEFT_THRESHOLD = 0.5;

// raw sample for buffering
struct TelemetrySample {
    unsigned long timestamp;
    float supplyCurrent;
    float meterSum;
    float voltage;
    float differential;
};

// full payload for mqtt
struct TelemetryPayload {
    char poleId[32];
    unsigned long timestamp;
    float supplyCurrent;
    float meterSum;
    float voltage;
    float differential;
    bool potentialTheft;
    float anomalyScore;
};

// state machine states
enum class EdgeState {
    IDLE,
    SAMPLING,
    TRANSMITTING,
    ERROR
};

// main service class
class EdgeService {
private:
    EdgeState currentState;
    EdgeState previousState;
    unsigned long stateEntryTime;
    WiFiClient wifiClient;
    PubSubClient mqttClient;
    unsigned long lastSampleTime;
    CircularBuffer<TelemetrySample, 100> offlineBuffer;
    float supplyCurrentAccumulator;
    float meterSumAccumulator;
    float voltageAccumulator;
    int sampleCount;
    int consecutiveErrors;
    static constexpr int MAX_CONSECUTIVE_ERRORS = 5;

    void transitionTo(EdgeState newState);
    const char* stateToString(EdgeState state);
    void handleIdleState();
    void handleSamplingState();
    void handleTransmittingState();
    void handleErrorState();
    float readCurrentSensor();
    float readVoltageSensor();
    float convertToAmps(float rawValue);
    float convertToVolts(float rawValue);
    float simulateMeterSum(float supplyCurrent);
    float calculateAnomalyScore(float differential);
    bool transmitPayload(const TelemetryPayload& payload);
    bool transmitBufferedData();

public:
    EdgeService();
    void initialize();
    void run();
};

#endif
