#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_SERVER = "your-mqtt-broker.com";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "gridguard-pole-001";
const char* MQTT_TOPIC = "grid/pole/telemetry";

const int CURRENT_SENSOR_PIN = 34;
const int VOLTAGE_SENSOR_PIN = 35;

const int SAMPLE_RATE_HZ = 1000;
const int SAMPLE_INTERVAL_US = 1000000 / SAMPLE_RATE_HZ;
const float THEFT_THRESHOLD = 0.5;

template<typename T, size_t Size>
class CircularBuffer {
private:
    T buffer[Size];
    size_t head = 0;
    size_t tail = 0;
    size_t count = 0;

public:
    bool push(const T& item) {
        if (count >= Size) return false;
        buffer[head] = item;
        head = (head + 1) % Size;
        count++;
        return true;
    }

    bool pop(T& item) {
        if (count == 0) return false;
        item = buffer[tail];
        tail = (tail + 1) % Size;
        count--;
        return true;
    }

    bool peek(T& item) const {
        if (count == 0) return false;
        item = buffer[tail];
        return true;
    }

    size_t size() const { return count; }
    bool empty() const { return count == 0; }
    bool full() const { return count >= Size; }
    void clear() { head = tail = count = 0; }
};

struct TelemetrySample {
    unsigned long timestamp;
    float supplyCurrent;
    float meterSum;
    float voltage;
    float differential;
};

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

enum class EdgeState {
    IDLE,
    SAMPLING,
    TRANSMITTING,
    ERROR
};

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

public:
    EdgeService() : mqttClient(wifiClient) {
        currentState = EdgeState::IDLE;
        previousState = EdgeState::IDLE;
        stateEntryTime = 0;
        lastSampleTime = 0;
        supplyCurrentAccumulator = 0.0f;
        meterSumAccumulator = 0.0f;
        voltageAccumulator = 0.0f;
        sampleCount = 0;
        consecutiveErrors = 0;
    }

    void initialize() {
        Serial.begin(115200);
        delay(1000);
        Serial.println("[EdgeService] GridGuard AI Edge Service Initializing...");

        analogSetAttenuation(ADC_11db);
        analogReadResolution(12);

        transitionTo(EdgeState::IDLE);
    }

    void run() {
        switch (currentState) {
            case EdgeState::IDLE:
                handleIdleState();
                break;
            case EdgeState::SAMPLING:
                handleSamplingState();
                break;
            case EdgeState::TRANSMITTING:
                handleTransmittingState();
                break;
            case EdgeState::ERROR:
                handleErrorState();
                break;
        }

        if (WiFi.status() == WL_CONNECTED) {
            mqttClient.loop();
        }
    }

private:
    void transitionTo(EdgeState newState) {
        if (currentState != newState) {
            previousState = currentState;
            currentState = newState;
            stateEntryTime = millis();
            
            Serial.print("[StateMachine] Transition: ");
            Serial.print(stateToString(previousState));
            Serial.print(" -> ");
            Serial.println(stateToString(newState));
        }
    }

    const char* stateToString(EdgeState state) {
        switch (state) {
            case EdgeState::IDLE: return "IDLE";
            case EdgeState::SAMPLING: return "SAMPLING";
            case EdgeState::TRANSMITTING: return "TRANSMITTING";
            case EdgeState::ERROR: return "ERROR";
            default: return "UNKNOWN";
        }
    }

    void handleIdleState() {
        if (WiFi.status() != WL_CONNECTED) {
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            
            unsigned long connectStart = millis();
            while (WiFi.status() != WL_CONNECTED && millis() - connectStart < 5000) {
                delay(10);
            }
        }

        if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
            mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
            if (mqttClient.connect(MQTT_CLIENT_ID)) {
                Serial.println("[MQTT] Connected to broker");
            }
        }

        transitionTo(EdgeState::SAMPLING);
    }

    void handleSamplingState() {
        unsigned long currentTime = micros();

        if (currentTime - lastSampleTime >= SAMPLE_INTERVAL_US) {
            lastSampleTime = currentTime;
            
            float rawCurrent = readCurrentSensor();
            float rawVoltage = readVoltageSensor();
            float supplyCurrent = convertToAmps(rawCurrent);
            float voltage = convertToVolts(rawVoltage);
            
            float meterSum = simulateMeterSum(supplyCurrent);
            
            float differential = supplyCurrent - meterSum;
            
            supplyCurrentAccumulator += supplyCurrent;
            meterSumAccumulator += meterSum;
            voltageAccumulator += voltage;
            sampleCount++;

            if (sampleCount >= 100) {
                float avgSupply = supplyCurrentAccumulator / sampleCount;
                float avgMeter = meterSumAccumulator / sampleCount;
                float avgVoltage = voltageAccumulator / sampleCount;
                float avgDifferential = avgSupply - avgMeter;

                if (abs(avgDifferential) > THEFT_THRESHOLD) {
                    TelemetryPayload payload;
                    strncpy(payload.poleId, MQTT_CLIENT_ID, sizeof(payload.poleId) - 1);
                    payload.poleId[sizeof(payload.poleId) - 1] = '\0';
                    payload.timestamp = millis();
                    payload.supplyCurrent = avgSupply;
                    payload.meterSum = avgMeter;
                    payload.voltage = avgVoltage;
                    payload.differential = avgDifferential;
                    payload.potentialTheft = true;
                    payload.anomalyScore = calculateAnomalyScore(avgDifferential);

                    if (WiFi.status() != WL_CONNECTED || !mqttClient.connected()) {
                        TelemetrySample sample;
                        sample.timestamp = payload.timestamp;
                        sample.supplyCurrent = payload.supplyCurrent;
                        sample.meterSum = payload.meterSum;
                        sample.voltage = payload.voltage;
                        sample.differential = payload.differential;
                        
                        if (!offlineBuffer.full()) {
                            offlineBuffer.push(sample);
                            Serial.println("[Buffer] Stored sample in offline buffer");
                        }
                    } else {
                        transmitPayload(payload);
                    }
                }

                supplyCurrentAccumulator = 0.0f;
                meterSumAccumulator = 0.0f;
                voltageAccumulator = 0.0f;
                sampleCount = 0;
            }
        }

        if (millis() - stateEntryTime > 1000) {
            transmitBufferedData();
            transitionTo(EdgeState::IDLE);
        }
    }

    void handleTransmittingState() {
        if (transmitBufferedData()) {
            transitionTo(EdgeState::IDLE);
        }
        
        if (millis() - stateEntryTime > 5000) {
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                transitionTo(EdgeState::ERROR);
            } else {
                transitionTo(EdgeState::IDLE);
            }
        }
    }

    void handleErrorState() {
        Serial.println("[Error] Entering error recovery mode");
        
        WiFi.disconnect();
        delay(100);
        consecutiveErrors = 0;
        
        transitionTo(EdgeState::IDLE);
    }

    float readCurrentSensor() {
        int rawValue = analogRead(CURRENT_SENSOR_PIN);
        return static_cast<float>(rawValue);
    }

    float readVoltageSensor() {
        int rawValue = analogRead(VOLTAGE_SENSOR_PIN);
        return static_cast<float>(rawValue);
    }

    float convertToAmps(float rawValue) {
        const float ADC_MAX = 4095.0f;
        const float VREF = 3.3f;
        const float SENSITIVITY = 0.066f;
        
        float voltage = (rawValue / ADC_MAX) * VREF;
        float current = (voltage - 1.65f) / SENSITIVITY;
        return current;
    }

    float convertToVolts(float rawValue) {
        const float ADC_MAX = 4095.0f;
        const float VREF = 3.3f;
        const float VOLTAGE_DIVIDER = 100.0f;
        
        float voltage = (rawValue / ADC_MAX) * VREF * VOLTAGE_DIVIDER;
        return voltage;
    }

    float simulateMeterSum(float supplyCurrent) {
        
        float baseLoad = supplyCurrent * 0.95f;
        float noise = random(-10, 10) / 100.0f;
        return baseLoad + noise;
    }

    float calculateAnomalyScore(float differential) {
        float score = abs(differential) / THEFT_THRESHOLD;
        return constrain(score, 0.0f, 1.0f);
    }

    bool transmitPayload(const TelemetryPayload& payload) {
        if (WiFi.status() != WL_CONNECTED || !mqttClient.connected()) {
            return false;
        }

        StaticJsonDocument<512> doc;
        doc["pole_id"] = payload.poleId;
        doc["timestamp"] = payload.timestamp;
        doc["supply_current"] = payload.supplyCurrent;
        doc["meter_sum"] = payload.meterSum;
        doc["voltage"] = payload.voltage;
        doc["differential"] = payload.differential;
        doc["potential_theft"] = payload.potentialTheft;
        doc["anomaly_score"] = payload.anomalyScore;

        char jsonBuffer[512];
        size_t len = serializeJson(doc, jsonBuffer);

        bool success = mqttClient.publish(MQTT_TOPIC, jsonBuffer, len);
        
        if (success) {
            Serial.println("[MQTT] Telemetry published successfully");
            consecutiveErrors = 0;
        } else {
            Serial.println("[MQTT] Publish failed");
            consecutiveErrors++;
        }

        return success;
    }

    bool transmitBufferedData() {
        if (offlineBuffer.empty()) {
            return true;
        }

        if (WiFi.status() != WL_CONNECTED || !mqttClient.connected()) {
            return false;
        }

        Serial.print("[Buffer] Transmitting ");
        Serial.print(offlineBuffer.size());
        Serial.println(" buffered samples");

        TelemetrySample sample;
        while (offlineBuffer.pop(sample)) {
            TelemetryPayload payload;
            strncpy(payload.poleId, MQTT_CLIENT_ID, sizeof(payload.poleId) - 1);
            payload.poleId[sizeof(payload.poleId) - 1] = '\0';
            payload.timestamp = sample.timestamp;
            payload.supplyCurrent = sample.supplyCurrent;
            payload.meterSum = sample.meterSum;
            payload.voltage = sample.voltage;
            payload.differential = sample.differential;
            payload.potentialTheft = abs(sample.differential) > THEFT_THRESHOLD;
            payload.anomalyScore = calculateAnomalyScore(sample.differential);

            if (!transmitPayload(payload)) {
                offlineBuffer.push(sample);
                return false;
            }
        }

        return true;
    }
};


EdgeService edgeService;

void setup() {
    edgeService.initialize();
}

void loop() {
    edgeService.run();
    yield();
}
