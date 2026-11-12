#include "edge_service.h"

EdgeService::EdgeService() : mqttClient(wifiClient) {
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

void EdgeService::initialize() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("[EdgeService] GridGuard AI Edge Service Initializing...");
    analogSetAttenuation(ADC_11db);
    analogReadResolution(12);
    transitionTo(EdgeState::IDLE);
}

void EdgeService::run() {
    // state machine
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
    // keep mqtt alive
    if (WiFi.status() == WL_CONNECTED) {
        mqttClient.loop();
    }
}

void EdgeService::transitionTo(EdgeState newState) {
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

const char* EdgeService::stateToString(EdgeState state) {
    switch (state) {
        case EdgeState::IDLE: return "IDLE";
        case EdgeState::SAMPLING: return "SAMPLING";
        case EdgeState::TRANSMITTING: return "TRANSMITTING";
        case EdgeState::ERROR: return "ERROR";
        default: return "UNKNOWN";
    }
}

void EdgeService::handleIdleState() {
    // connect wifi if needed
    if (WiFi.status() != WL_CONNECTED) {
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        unsigned long connectStart = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - connectStart < 5000) {
            delay(10);
        }
    }
    // connect mqtt if needed
    if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
        mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
        if (mqttClient.connect(MQTT_CLIENT_ID)) {
            Serial.println("[MQTT] Connected to broker");
        }
    }
    transitionTo(EdgeState::SAMPLING);
}

void EdgeService::handleSamplingState() {
    unsigned long currentTime = micros();
    // check sample interval (non-blocking)
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
        // process every 100 samples
        if (sampleCount >= 100) {
            float avgSupply = supplyCurrentAccumulator / sampleCount;
            float avgMeter = meterSumAccumulator / sampleCount;
            float avgVoltage = voltageAccumulator / sampleCount;
            float avgDifferential = avgSupply - avgMeter;
            // theft detected
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
                // store offline if no connection
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
            // reset accumulators
            supplyCurrentAccumulator = 0.0f;
            meterSumAccumulator = 0.0f;
            voltageAccumulator = 0.0f;
            sampleCount = 0;
        }
    }
    // periodic state reset
    if (millis() - stateEntryTime > 1000) {
        transmitBufferedData();
        transitionTo(EdgeState::IDLE);
    }
}

void EdgeService::handleTransmittingState() {
    if (transmitBufferedData()) {
        transitionTo(EdgeState::IDLE);
    }
    // timeout handling
    if (millis() - stateEntryTime > 5000) {
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            transitionTo(EdgeState::ERROR);
        } else {
            transitionTo(EdgeState::IDLE);
        }
    }
}

void EdgeService::handleErrorState() {
    Serial.println("[Error] Entering error recovery mode");
    WiFi.disconnect();
    delay(100);
    consecutiveErrors = 0;
    transitionTo(EdgeState::IDLE);
}

float EdgeService::readCurrentSensor() {
    int rawValue = analogRead(CURRENT_SENSOR_PIN);
    return static_cast<float>(rawValue);
}

float EdgeService::readVoltageSensor() {
    int rawValue = analogRead(VOLTAGE_SENSOR_PIN);
    return static_cast<float>(rawValue);
}

float EdgeService::convertToAmps(float rawValue) {
    const float ADC_MAX = 4095.0f;
    const float VREF = 3.3f;
    const float SENSITIVITY = 0.066f;
    float voltage = (rawValue / ADC_MAX) * VREF;
    float current = (voltage - 1.65f) / SENSITIVITY;
    return current;
}

float EdgeService::convertToVolts(float rawValue) {
    const float ADC_MAX = 4095.0f;
    const float VREF = 3.3f;
    const float VOLTAGE_DIVIDER = 100.0f;
    float voltage = (rawValue / ADC_MAX) * VREF * VOLTAGE_DIVIDER;
    return voltage;
}

float EdgeService::simulateMeterSum(float supplyCurrent) {
    float baseLoad = supplyCurrent * 0.95f;
    float noise = random(-10, 10) / 100.0f;
    return baseLoad + noise;
}

float EdgeService::calculateAnomalyScore(float differential) {
    float score = abs(differential) / THEFT_THRESHOLD;
    return constrain(score, 0.0f, 1.0f);
}

bool EdgeService::transmitPayload(const TelemetryPayload& payload) {
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

bool EdgeService::transmitBufferedData() {
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
