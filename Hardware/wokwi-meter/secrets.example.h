// Copy this file to secrets.h and fill it in. secrets.h is git-ignored.
// TESTNET / DEMO ONLY: never use a key that holds real money.
//
// On wokwi.com: add a new file called secrets.h to the project and paste
// these lines into it, with your values.

// The meter's private key: 0x + 64 hex characters. Use the same test key as
// Hardware/wokwi-spike/secrets.h, so the meter keeps the device address the
// contract expects (0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3).
#define DEVICE_PRIVATE_KEY_HEX "0x0000000000000000000000000000000000000000000000000000000000000000"

// The MeterOracle contract address. Signatures only count for this contract.
// Keep this placeholder until MeterOracle is deployed on Base Sepolia, then
// put the real address here.
#define VERIFYING_CONTRACT "0x1111111111111111111111111111111111111111"

// Optional overrides (defaults shown):
// #define METER_ID 1
// #define READING_INTERVAL_S 30
// #define MQTT_PRIMARY_HOST "test.mosquitto.org"
// #define MQTT_FALLBACK_HOST "broker.hivemq.com"
