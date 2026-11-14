/*
 * SolarShare meter firmware (GitHub issues #12 and #13)
 * -----------------------------------------------------
 * A simulated solar meter for Wokwi. It:
 *
 *   1. Reads two dials and two switches:
 *        - "sunlight" slider       -> power the panels produce (0-10,000 W)
 *        - "illegal connection" dial -> power stolen before it is sold (0-5,000 W)
 *        - "tamper" switch         -> someone opened the meter box
 *        - "network" switch        -> cut the meter's internet link (for testing)
 *   2. Adds power up over time into two lifetime totals that never go down:
 *        energy produced (Wh) and energy sold (Wh).
 *        sold = produced - about 7% normal losses - stolen power
 *   3. Every 30 seconds builds a MeterReading with the real time (from NTP)
 *      and a sequence number that only goes up. Just before each reading it
 *      checks the clock against NTP again and fixes it, because Wokwi stops
 *      the ESP32's clock whenever the simulation pauses.
 *   4. Signs it with EIP-712 (Keccak-256 + secp256k1), the same code as the
 *      spike in Hardware/wokwi-spike, so the MeterOracle contract can check it.
 *   5. Publishes it as JSON over MQTT. If the network is down, readings wait in
 *      a queue and are sent later, oldest first.
 *
 * The message format is described in MESSAGE_FORMAT.md. Keep the MeterReading
 * field order identical to the spike: the contract and the relayer depend on it.
 *
 * The device key lives in secrets.h (git-ignored). TESTNET / DEMO ONLY.
 */

#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <string.h>
#include <sys/time.h>
#include <time.h>
#include <uECC.h>

#if __has_include("esp_random.h")
#include "esp_random.h"
#else
#include "esp_system.h"
#endif

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Missing secrets.h. Add a file called secrets.h with your test key (see secrets.example.h and README.md)."
#endif

// ---------------------------------------------------------------------------
// Settings. Anything here can be overridden with a #define in secrets.h.
// ---------------------------------------------------------------------------
#ifndef METER_ID
#define METER_ID 1
#endif
// The deployed MeterOracle address. Until it is deployed, the spike's
// placeholder is used. It MUST match the contract, or every signature fails.
#ifndef VERIFYING_CONTRACT
#define VERIFYING_CONTRACT "0x1111111111111111111111111111111111111111"
#endif
#ifndef READING_INTERVAL_S
#define READING_INTERVAL_S 30
#endif
#ifndef WIFI_SSID
#define WIFI_SSID "Wokwi-GUEST"  // Wokwi's simulated Wi-Fi, which reaches the internet
#endif
#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD ""
#endif
#ifndef MQTT_PRIMARY_HOST
#define MQTT_PRIMARY_HOST "test.mosquitto.org"
#endif
#ifndef MQTT_FALLBACK_HOST
#define MQTT_FALLBACK_HOST "broker.hivemq.com"
#endif
#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif

// Pins (see diagram.json)
static const int PIN_SUNLIGHT = 34;   // slide potentiometer
static const int PIN_STOLEN = 35;     // rotary potentiometer
static const int PIN_TAMPER = 27;     // slide switch to GND = tamper
static const int PIN_NETWORK = 14;    // slide switch to GND = network cut
static const int PIN_LED_GREEN = 25;  // all good, everything sent
static const int PIN_LED_YELLOW = 26; // offline or readings waiting to be sent
static const int PIN_LED_RED = 33;    // tamper, or the oracle would see theft

// The physics of the demo mini-grid
static const uint32_t RATED_POWER_W = 10000;  // 10 kWp community mini-grid
static const uint32_t MAX_STOLEN_W = 5000;    // the "illegal connection" dial at full
static const uint32_t LOSS_PERCENT = 7;       // normal cable and inverter losses
static const uint32_t THEFT_GAP_PERCENT = 15; // what MeterOracle treats as theft (display only)

static const uint32_t SAMPLE_PERIOD_MS = 250;  // read the dials 4 times a second
static const int ADC_SAMPLES = 8;              // average 8 ADC reads per sample
static const uint32_t STATUS_PERIOD_MS = 5000; // print a status line every 5 s
static const uint32_t READING_INTERVAL_MS = (uint32_t)READING_INTERVAL_S * 1000UL;
static const size_t QUEUE_SIZE = 120;          // one hour of readings at 30 s

// Quick readings: when the meter sees theft start or stop, it doesn't wait for
// the next 30 s reading. It closes the current reading straight away and sends
// a clean one shortly after, so the oracle (and the app) catch up in seconds.
// A reading must cover at least MIN_WINDOW_WH of production: energy is counted
// in whole Wh, and over a tiny window a 1 Wh rounding step looks like theft.
static const uint32_t MIN_WINDOW_WH = 20;          // at 5 kW that is about 14 s
static const uint32_t MIN_WINDOW_MS = 10000;       // never closer together than this
static const uint32_t CHANGE_STABLE_MS = 1000;     // new state must hold 1 s (knob turning)
static const uint32_t LIVE_PERIOD_MS = 2000;       // live preview to the app every 2 s
static const uint64_t MS_PER_HOUR = 3600000ULL;

// ---------------------------------------------------------------------------
// EIP-712 domain and the signed struct. Same as the spike (#4).
// ---------------------------------------------------------------------------
static const char *DOMAIN_NAME = "SolarShare MeterOracle";
static const char *DOMAIN_VERSION = "1";
static const uint64_t DOMAIN_CHAIN_ID = 84532;  // Base Sepolia

static const char *EIP712_DOMAIN_TYPE =
    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";
static const char *METER_READING_TYPE =
    "MeterReading(uint32 meterId,uint64 seq,uint64 timestamp,uint64 energyProducedWh,"
    "uint64 energySoldWh,uint32 powerW,bool tamper)";

struct MeterReading {
  uint32_t meterId;
  uint64_t seq;
  uint64_t timestamp;         // unix seconds
  uint64_t energyProducedWh;  // lifetime counter
  uint64_t energySoldWh;      // lifetime counter
  uint32_t powerW;            // instantaneous power
  bool tamper;
};

struct SignedReading {
  MeterReading reading;
  uint8_t sig[64];  // r (32 bytes) || s (32 bytes), s already low
};

// ---------------------------------------------------------------------------
// Keccak-256 (Ethereum flavour), unchanged from the spike. Ethereum's
// Keccak-256 pads with 0x01; SHA3-256 pads with 0x06.
// ---------------------------------------------------------------------------
static const uint64_t KECCAK_RC[24] = {
    0x0000000000000001ULL, 0x0000000000008082ULL, 0x800000000000808aULL, 0x8000000080008000ULL,
    0x000000000000808bULL, 0x0000000080000001ULL, 0x8000000080008081ULL, 0x8000000000008009ULL,
    0x000000000000008aULL, 0x0000000000000088ULL, 0x0000000080008009ULL, 0x000000008000000aULL,
    0x000000008000808bULL, 0x800000000000008bULL, 0x8000000000008089ULL, 0x8000000000008003ULL,
    0x8000000000008002ULL, 0x8000000000000080ULL, 0x000000000000800aULL, 0x800000008000000aULL,
    0x8000000080008081ULL, 0x8000000000008080ULL, 0x0000000080000001ULL, 0x8000000080008008ULL};
static const uint8_t KECCAK_ROT[24] = {1,  3,  6,  10, 15, 21, 28, 36, 45, 55, 2,  14,
                                       27, 41, 56, 8,  25, 43, 62, 18, 39, 61, 20, 44};
static const uint8_t KECCAK_PI[24] = {10, 7,  11, 17, 18, 3, 5,  16, 8,  21, 24, 4,
                                      15, 23, 19, 13, 12, 2, 20, 14, 22, 9,  6,  1};

static inline uint64_t rotl64(uint64_t x, unsigned n) { return (x << n) | (x >> (64 - n)); }

static void keccakF1600(uint64_t st[25]) {
  uint64_t bc[5];
  for (int round = 0; round < 24; round++) {
    for (int i = 0; i < 5; i++) bc[i] = st[i] ^ st[i + 5] ^ st[i + 10] ^ st[i + 15] ^ st[i + 20];
    for (int i = 0; i < 5; i++) {
      uint64_t t = bc[(i + 4) % 5] ^ rotl64(bc[(i + 1) % 5], 1);
      for (int j = 0; j < 25; j += 5) st[j + i] ^= t;
    }
    uint64_t t = st[1];
    for (int i = 0; i < 24; i++) {
      int j = KECCAK_PI[i];
      uint64_t tmp = st[j];
      st[j] = rotl64(t, KECCAK_ROT[i]);
      t = tmp;
    }
    for (int j = 0; j < 25; j += 5) {
      for (int i = 0; i < 5; i++) bc[i] = st[j + i];
      for (int i = 0; i < 5; i++) st[j + i] ^= (~bc[(i + 1) % 5]) & bc[(i + 2) % 5];
    }
    st[0] ^= KECCAK_RC[round];
  }
}

static inline void keccakXorByte(uint64_t st[25], size_t pos, uint8_t b) {
  st[pos / 8] ^= (uint64_t)b << (8 * (pos % 8));
}

static void keccak256(const uint8_t *data, size_t len, uint8_t out[32]) {
  const size_t RATE = 136;
  uint64_t st[25];
  memset(st, 0, sizeof(st));
  while (len >= RATE) {
    for (size_t i = 0; i < RATE; i++) keccakXorByte(st, i, data[i]);
    keccakF1600(st);
    data += RATE;
    len -= RATE;
  }
  for (size_t i = 0; i < len; i++) keccakXorByte(st, i, data[i]);
  keccakXorByte(st, len, 0x01);
  keccakXorByte(st, RATE - 1, 0x80);
  keccakF1600(st);
  for (size_t i = 0; i < 32; i++) out[i] = (uint8_t)(st[i / 8] >> (8 * (i % 8)));
}

static void keccak256Str(const char *s, uint8_t out[32]) {
  keccak256((const uint8_t *)s, strlen(s), out);
}

// ---------------------------------------------------------------------------
// Small helpers: hex, numbers, text.
// ---------------------------------------------------------------------------
static const char *HEX_DIGITS = "0123456789abcdef";

static int hexNibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

// Parses "0x" + 2*len hex chars into out. Returns false on bad input.
static bool parseHex(const char *hex, uint8_t *out, size_t len) {
  if (hex[0] == '0' && (hex[1] == 'x' || hex[1] == 'X')) hex += 2;
  if (strlen(hex) != len * 2) return false;
  for (size_t i = 0; i < len; i++) {
    int hi = hexNibble(hex[2 * i]), lo = hexNibble(hex[2 * i + 1]);
    if (hi < 0 || lo < 0) return false;
    out[i] = (uint8_t)((hi << 4) | lo);
  }
  return true;
}

// Writes "0x" + lowercase hex into out (needs 2*len + 3 bytes).
static void toHex(const uint8_t *data, size_t len, char *out) {
  *out++ = '0';
  *out++ = 'x';
  for (size_t i = 0; i < len; i++) {
    *out++ = HEX_DIGITS[data[i] >> 4];
    *out++ = HEX_DIGITS[data[i] & 0x0f];
  }
  *out = '\0';
}

// Writes a uint64 as decimal into out (needs 21 bytes). Returns out.
static char *u64ToStr(uint64_t v, char out[21]) {
  char buf[21];
  int i = 20;
  buf[i] = '\0';
  do {
    buf[--i] = (char)('0' + (v % 10));
    v /= 10;
  } while (v > 0);
  strcpy(out, &buf[i]);
  return out;
}

// Parses a plain decimal string into a uint64. Rejects anything else.
static bool parseU64(const char *s, uint64_t *out) {
  if (!*s) return false;
  uint64_t v = 0;
  for (; *s; s++) {
    if (*s < '0' || *s > '9') return false;
    uint64_t d = (uint64_t)(*s - '0');
    if (v > (UINT64_MAX - d) / 10) return false;
    v = v * 10 + d;
  }
  *out = v;
  return true;
}

// "12,345" style numbers for the serial console.
static char *withCommas(uint64_t v, char out[28]) {
  char digits[21];
  u64ToStr(v, digits);
  size_t n = strlen(digits), j = 0;
  for (size_t i = 0; i < n; i++) {
    if (i > 0 && (n - i) % 3 == 0) out[j++] = ',';
    out[j++] = digits[i];
  }
  out[j] = '\0';
  return out;
}

static void formatUtc(uint64_t unixSeconds, char out[32]) {
  time_t t = (time_t)unixSeconds;
  struct tm tmv;
  gmtime_r(&t, &tmv);
  strftime(out, 32, "%Y-%m-%d %H:%M:%S UTC", &tmv);
}

// ABI-encodes an unsigned integer as a 32-byte big-endian word.
static void abiUint(uint8_t word[32], uint64_t v) {
  memset(word, 0, 32);
  for (int i = 0; i < 8; i++) word[31 - i] = (uint8_t)(v >> (8 * i));
}

// ---------------------------------------------------------------------------
// EIP-712 hashing (same as the spike)
// ---------------------------------------------------------------------------
static uint8_t g_domainSeparator[32];

static bool computeDomainSeparator(uint8_t out[32]) {
  uint8_t enc[5 * 32];
  uint8_t addr[20];
  if (!parseHex(VERIFYING_CONTRACT, addr, 20)) return false;
  keccak256Str(EIP712_DOMAIN_TYPE, enc);
  keccak256Str(DOMAIN_NAME, enc + 32);
  keccak256Str(DOMAIN_VERSION, enc + 64);
  abiUint(enc + 96, DOMAIN_CHAIN_ID);
  memset(enc + 128, 0, 32);
  memcpy(enc + 128 + 12, addr, 20);  // address is right-aligned in its word
  keccak256(enc, sizeof(enc), out);
  return true;
}

static void structHash(const MeterReading &r, uint8_t out[32]) {
  uint8_t enc[8 * 32];
  keccak256Str(METER_READING_TYPE, enc);
  abiUint(enc + 32, r.meterId);
  abiUint(enc + 64, r.seq);
  abiUint(enc + 96, r.timestamp);
  abiUint(enc + 128, r.energyProducedWh);
  abiUint(enc + 160, r.energySoldWh);
  abiUint(enc + 192, r.powerW);
  abiUint(enc + 224, r.tamper ? 1 : 0);
  keccak256(enc, sizeof(enc), out);
}

// digest = keccak256(0x19 0x01 || domainSeparator || structHash)
static void readingDigest(const MeterReading &r, uint8_t out[32]) {
  uint8_t buf[66];
  buf[0] = 0x19;
  buf[1] = 0x01;
  memcpy(buf + 2, g_domainSeparator, 32);
  structHash(r, buf + 34);
  keccak256(buf, sizeof(buf), out);
}

// ---------------------------------------------------------------------------
// secp256k1 (same as the spike)
// ---------------------------------------------------------------------------
static const struct uECC_Curve_t *g_curve;
static uint8_t g_privateKey[32];
static uint8_t g_publicKey[64];
static char g_deviceAddress[43];  // EIP-55 checksummed "0x..."

static int espRng(uint8_t *dest, unsigned size) {
  while (size > 0) {
    uint32_t r = esp_random();
    for (int i = 0; i < 4 && size > 0; i++, size--) *dest++ = (uint8_t)(r >> (8 * i));
  }
  return 1;
}

static const uint8_t SECP256K1_N[32] = {
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe,
    0xba, 0xae, 0xdc, 0xe6, 0xaf, 0x48, 0xa0, 0x3b, 0xbf, 0xd2, 0x5e, 0x8c, 0xd0, 0x36, 0x41, 0x41};
static const uint8_t SECP256K1_HALF_N[32] = {
    0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0x5d, 0x57, 0x6e, 0x73, 0x57, 0xa4, 0x50, 0x1d, 0xdf, 0xe9, 0x2f, 0x46, 0x68, 0x1b, 0x20, 0xa0};

// Ethereum (and OpenZeppelin's ECDSA) only accept "low-s" signatures (s <= n/2).
static bool normalizeLowS(uint8_t s[32]) {
  if (memcmp(s, SECP256K1_HALF_N, 32) <= 0) return false;
  int borrow = 0;
  for (int i = 31; i >= 0; i--) {
    int d = (int)SECP256K1_N[i] - (int)s[i] - borrow;
    borrow = d < 0 ? 1 : 0;
    s[i] = (uint8_t)(d + (borrow ? 256 : 0));
  }
  return true;
}

// Ethereum address = last 20 bytes of keccak256(public key), written with the
// EIP-55 mixed-case checksum (the same form wallets and Basescan show).
static void ethAddressChecksummed(const uint8_t pub[64], char out[43]) {
  uint8_t h[32], addr[20], lowerHash[32];
  char lower[41];
  keccak256(pub, 64, h);
  memcpy(addr, h + 12, 20);
  for (int i = 0; i < 20; i++) {
    lower[2 * i] = HEX_DIGITS[addr[i] >> 4];
    lower[2 * i + 1] = HEX_DIGITS[addr[i] & 0x0f];
  }
  lower[40] = '\0';
  keccak256((const uint8_t *)lower, 40, lowerHash);
  out[0] = '0';
  out[1] = 'x';
  for (int i = 0; i < 40; i++) {
    char c = lower[i];
    uint8_t nib = (i % 2 == 0) ? (lowerHash[i / 2] >> 4) : (lowerHash[i / 2] & 0x0f);
    if (c >= 'a' && c <= 'f' && nib >= 8) c = (char)(c - 'a' + 'A');
    out[2 + i] = c;
  }
  out[42] = '\0';
}

static bool signReading(SignedReading &sr) {
  uint8_t digest[32];
  readingDigest(sr.reading, digest);
  if (!uECC_sign(g_privateKey, digest, 32, sr.sig, g_curve)) return false;
  normalizeLowS(sr.sig + 32);
  return true;
}

static bool verifyReading(const SignedReading &sr) {
  uint8_t digest[32];
  readingDigest(sr.reading, digest);
  return uECC_verify(g_publicKey, digest, 32, sr.sig, g_curve) == 1;
}

// ---------------------------------------------------------------------------
// The MQTT message (see MESSAGE_FORMAT.md)
// ---------------------------------------------------------------------------
static char g_readingTopic[64];
static char g_stateTopic[64];
static char g_liveTopic[64];  // unsigned live preview (see MESSAGE_FORMAT.md)

static size_t buildMessage(const SignedReading &sr, char *out, size_t outLen) {
  const MeterReading &r = sr.reading;
  char seq[21], ts[21], prod[21], sold[21], rHex[67], sHex[67];
  toHex(sr.sig, 32, rHex);
  toHex(sr.sig + 32, 32, sHex);
  int n = snprintf(out, outLen,
                   "{\"reading\":{\"meterId\":%lu,\"seq\":\"%s\",\"timestamp\":\"%s\","
                   "\"energyProducedWh\":\"%s\",\"energySoldWh\":\"%s\",\"powerW\":%lu,"
                   "\"tamper\":%s},\"signature\":{\"r\":\"%s\",\"s\":\"%s\"},\"device\":\"%s\"}",
                   (unsigned long)r.meterId, u64ToStr(r.seq, seq), u64ToStr(r.timestamp, ts),
                   u64ToStr(r.energyProducedWh, prod), u64ToStr(r.energySoldWh, sold),
                   (unsigned long)r.powerW, r.tamper ? "true" : "false", rHex, sHex,
                   g_deviceAddress);
  return (n > 0 && (size_t)n < outLen) ? (size_t)n : 0;
}

// Finds "key": in a flat JSON text and copies its value (quoted or bare).
// Good enough for our own messages; not a general JSON parser.
static bool jsonValue(const char *json, const char *key, char *out, size_t outLen) {
  char pattern[32];
  snprintf(pattern, sizeof(pattern), "\"%s\":", key);
  const char *p = strstr(json, pattern);
  if (!p) return false;
  p += strlen(pattern);
  bool quoted = (*p == '"');
  if (quoted) p++;
  size_t i = 0;
  while (*p && i + 1 < outLen) {
    if (quoted ? (*p == '"') : (*p == ',' || *p == '}')) break;
    out[i++] = *p++;
  }
  out[i] = '\0';
  return i > 0;
}

static bool parseMessage(const char *json, SignedReading &sr) {
  char v[80];
  uint64_t n;
  MeterReading &r = sr.reading;
  if (!jsonValue(json, "meterId", v, sizeof(v)) || !parseU64(v, &n) || n > 0xffffffffULL) return false;
  r.meterId = (uint32_t)n;
  if (!jsonValue(json, "seq", v, sizeof(v)) || !parseU64(v, &r.seq)) return false;
  if (!jsonValue(json, "timestamp", v, sizeof(v)) || !parseU64(v, &r.timestamp)) return false;
  if (!jsonValue(json, "energyProducedWh", v, sizeof(v)) || !parseU64(v, &r.energyProducedWh)) return false;
  if (!jsonValue(json, "energySoldWh", v, sizeof(v)) || !parseU64(v, &r.energySoldWh)) return false;
  if (!jsonValue(json, "powerW", v, sizeof(v)) || !parseU64(v, &n) || n > 0xffffffffULL) return false;
  r.powerW = (uint32_t)n;
  if (!jsonValue(json, "tamper", v, sizeof(v))) return false;
  if (strcmp(v, "true") == 0) r.tamper = true;
  else if (strcmp(v, "false") == 0) r.tamper = false;
  else return false;
  if (!jsonValue(json, "r", v, sizeof(v)) || !parseHex(v, sr.sig, 32)) return false;
  if (!jsonValue(json, "s", v, sizeof(v)) || !parseHex(v, sr.sig + 32, 32)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Offline queue: readings wait here until they are sent, oldest first.
// Energy totals are cumulative, so if the queue ever overflows we drop the
// OLDEST reading: no energy is lost, the next reading still carries the totals.
// ---------------------------------------------------------------------------
static SignedReading g_queue[QUEUE_SIZE];
static size_t g_queueHead = 0;  // oldest
static size_t g_queueCount = 0;

static void queuePush(const SignedReading &sr) {
  if (g_queueCount == QUEUE_SIZE) {
    char seq[21];
    Serial.printf("[queue] full, dropping the oldest reading (seq %s)\n",
                  u64ToStr(g_queue[g_queueHead].reading.seq, seq));
    g_queueHead = (g_queueHead + 1) % QUEUE_SIZE;
    g_queueCount--;
  }
  g_queue[(g_queueHead + g_queueCount) % QUEUE_SIZE] = sr;
  g_queueCount++;
}

static SignedReading &queueFront() { return g_queue[g_queueHead]; }

static void queuePop() {
  g_queueHead = (g_queueHead + 1) % QUEUE_SIZE;
  g_queueCount--;
}

// ---------------------------------------------------------------------------
// Meter state: dials, energy totals, sequence number
// ---------------------------------------------------------------------------
static uint64_t g_producedWms = 0;  // lifetime energy produced, in watt-milliseconds
static uint64_t g_soldWms = 0;      // lifetime energy sold, in watt-milliseconds
static uint64_t g_nextSeq = 1;
static uint32_t g_producedW = 0, g_stolenW = 0, g_lossesW = 0, g_soldW = 0;
static bool g_tamper = false;
static bool g_networkCut = false;
static uint64_t g_lastReadingProducedWh = 0, g_lastReadingSoldWh = 0;

// Reading schedule (see "Quick readings" at the top).
static uint32_t g_lastReadingMs = 0;     // when the last reading was closed (millis)
static uint32_t g_nextReadingMs = 0;     // when the next one is due (millis)
static bool g_followUpPending = false;   // after a quick reading, send a clean one
static bool g_alarmSeen = false;         // theft-or-tamper, as last confirmed
static bool g_alarmCandidate = false;    // what the dials say right now
static uint32_t g_candidateSinceMs = 0;  // since when they have said it

// Average several ADC reads to smooth out noise (the same idea as the old
// current_sensor driver this replaces). Returns 0..4095.
static uint32_t readAdcAverage(int pin) {
  uint32_t sum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) sum += (uint32_t)analogRead(pin);
  return sum / ADC_SAMPLES;
}

static void sampleAndIntegrate(uint32_t elapsedMs) {
  uint32_t sunRaw = readAdcAverage(PIN_SUNLIGHT);
  uint32_t theftRaw = readAdcAverage(PIN_STOLEN);
  g_tamper = digitalRead(PIN_TAMPER) == LOW;
  g_networkCut = digitalRead(PIN_NETWORK) == LOW;

  g_producedW = sunRaw * RATED_POWER_W / 4095;
  if (g_producedW > RATED_POWER_W) g_producedW = RATED_POWER_W;
  g_lossesW = g_producedW * LOSS_PERCENT / 100;
  uint32_t available = g_producedW - g_lossesW;
  uint32_t wantStolen = theftRaw * MAX_STOLEN_W / 4095;
  g_stolenW = wantStolen < available ? wantStolen : available;  // can't steal more than is there
  g_soldW = available - g_stolenW;

  // Energy = power x time. Both totals only ever grow.
  g_producedWms += (uint64_t)g_producedW * elapsedMs;
  g_soldWms += (uint64_t)g_soldW * elapsedMs;
}

static bool looksLikeTheftNow() {
  return g_producedW >= 100 && (uint64_t)g_soldW * 100 < (uint64_t)g_producedW * (100 - THEFT_GAP_PERCENT);
}

// Percentage by which sold falls behind produced (0 when nothing produced).
static unsigned gapPercent(uint64_t produced, uint64_t sold) {
  if (produced == 0 || sold >= produced) return 0;
  return (unsigned)(((produced - sold) * 100 + produced / 2) / produced);
}

// The shortest window a reading may cover: long enough for MIN_WINDOW_WH of
// production at the current power, never under MIN_WINDOW_MS, never over the
// normal interval.
static uint32_t minWindowMs() {
  if (g_producedW < 100) return READING_INTERVAL_MS;  // dark: nothing to hurry for
  uint32_t ms = (uint32_t)((uint64_t)MIN_WINDOW_WH * MS_PER_HOUR / g_producedW);
  if (ms < MIN_WINDOW_MS) ms = MIN_WINDOW_MS;
  if (ms > READING_INTERVAL_MS) ms = READING_INTERVAL_MS;
  return ms;
}

// When theft (or tamper) starts or stops and stays that way for a second,
// close the current reading as soon as it is long enough, then send a clean
// reading of the new state one short window later.
static void watchForChange(uint32_t now) {
  bool alarm = g_tamper || looksLikeTheftNow();
  if (alarm != g_alarmCandidate) {
    g_alarmCandidate = alarm;
    g_candidateSinceMs = now;
    return;
  }
  if (alarm == g_alarmSeen || now - g_candidateSinceMs < CHANGE_STABLE_MS) return;
  g_alarmSeen = alarm;
  uint32_t closeAt = g_lastReadingMs + minWindowMs();
  bool closeNow = (int32_t)(closeAt - now) <= 0;
  if (closeNow) closeAt = now;
  if ((int32_t)(closeAt - g_nextReadingMs) < 0) g_nextReadingMs = closeAt;
  g_followUpPending = true;
  Serial.printf("[quick] meter sees %s: closing this reading %s, a clean one follows\n",
                alarm ? (g_tamper ? "TAMPER" : "THEFT") : "normal sales again",
                closeNow ? "now" : "as soon as it is long enough");
}

static void resyncClock();       // in the Network section below
static uint64_t g_lastTimestamp = 0;  // timestamp of the last reading we signed

static void makeReading() {
  resyncClock();  // make sure the timestamp is the real time, even after a pause
  uint64_t now = (uint64_t)time(nullptr);
  // Never go back in time: MeterOracle refuses a reading older than the last one.
  if (now < g_lastTimestamp) now = g_lastTimestamp;
  g_lastTimestamp = now;

  SignedReading sr;
  MeterReading &r = sr.reading;
  r.meterId = METER_ID;
  r.seq = g_nextSeq++;
  r.timestamp = now;
  r.energyProducedWh = g_producedWms / MS_PER_HOUR;
  r.energySoldWh = g_soldWms / MS_PER_HOUR;
  r.powerW = g_producedW;
  r.tamper = g_tamper;

  uint32_t t0 = millis();
  if (!signReading(sr)) {
    Serial.println("[sign] ERROR: signing failed, reading skipped");
    return;
  }
  uint32_t signMs = millis() - t0;

  uint64_t dProduced = r.energyProducedWh - g_lastReadingProducedWh;
  uint64_t dSold = r.energySoldWh - g_lastReadingSoldWh;
  g_lastReadingProducedWh = r.energyProducedWh;
  g_lastReadingSoldWh = r.energySoldWh;
  unsigned gap = gapPercent(dProduced, dSold);

  char seq[21], when[32], a[28], b[28], c[28], d[28], e[28], rHex[67], sHex[67];
  formatUtc(r.timestamp, when);
  toHex(sr.sig, 32, rHex);
  toHex(sr.sig + 32, 32, sHex);
  Serial.println();
  Serial.printf("[reading] seq %s at %s\n", u64ToStr(r.seq, seq), when);
  Serial.printf("          produced %s Wh (+%s)  sold %s Wh (+%s)  gap %u%%%s\n",
                withCommas(r.energyProducedWh, a), withCommas(dProduced, b),
                withCommas(r.energySoldWh, c), withCommas(dSold, d), gap,
                gap > THEFT_GAP_PERCENT ? "  <-- THEFT (more than 15%)" : "");
  Serial.printf("          power %s W  tamper %s\n", withCommas(r.powerW, e),
                r.tamper ? "YES  <-- TAMPER" : "no");
  Serial.printf("          signed in %lu ms: r=%s\n", (unsigned long)signMs, rHex);
  Serial.printf("                              s=%s\n", sHex);
  queuePush(sr);
}

// ---------------------------------------------------------------------------
// Network: Wi-Fi, NTP time, MQTT with a fallback broker
// ---------------------------------------------------------------------------
static WiFiClient g_net;
static PubSubClient g_mqtt(g_net);
static char g_clientId[48];
static const char *BROKERS[2] = {MQTT_PRIMARY_HOST, MQTT_FALLBACK_HOST};
static int g_broker = 0;
static uint32_t g_lastConnectAttempt = 0;
static bool g_wasConnected = false;
static bool g_stateDirty = false;          // a reading was sent since the state was saved
static SignedReading g_lastSent;           // last reading the broker accepted

static void connectWifi() {
  Serial.printf("[wifi] connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);  // channel 6 makes Wokwi connect faster
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println(" connected");
}

static void syncTime() {
  Serial.print("[time] getting the real time from NTP");
  configTime(0, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");
  while (time(nullptr) < 1700000000) {  // anything before Nov 2023 means "not set yet"
    delay(250);
    Serial.print(".");
  }
  char when[32];
  formatUtc((uint64_t)time(nullptr), when);
  Serial.printf(" %s\n", when);
}

// --- Keeping the clock right --------------------------------------------------
// syncTime() asks NTP for the time once, at boot. After that the ESP32 counts
// on its own clock. In Wokwi that clock stops whenever the simulation pauses
// (for example while the browser tab is hidden), so after a pause every reading
// would carry a time from the past, and MeterOracle would call the meter
// OFFLINE (or refuse the reading as too old).
//
// So before each reading we ask an NTP server again: one small UDP packet,
// waiting at most NTP_TIMEOUT_MS for the answer. If our clock is off by a
// second or more, we set it to the real time and print a [time] line.
static const char *NTP_SERVERS[3] = {"time.google.com", "time.cloudflare.com", "pool.ntp.org"};
static const uint16_t NTP_LOCAL_PORT = 4123;
static const uint32_t NTP_TIMEOUT_MS = 1000;
static const int64_t CLOCK_FIX_THRESHOLD_MS = 1000;     // timestamps are whole seconds
static const uint64_t NTP_TO_UNIX_SECONDS = 2208988800ULL;  // 1900-01-01 to 1970-01-01
static WiFiUDP g_ntpUdp;
static bool g_ntpUdpReady = false;
static int g_ntpServer = 0;
static bool g_ntpFailing = false;

static int64_t clockNowMs() {
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  return (int64_t)tv.tv_sec * 1000 + tv.tv_usec / 1000;
}

static void setClockMs(int64_t unixMs) {
  struct timeval tv;
  tv.tv_sec = (time_t)(unixMs / 1000);
  tv.tv_usec = (suseconds_t)((unixMs % 1000) * 1000);
  settimeofday(&tv, nullptr);
}

static uint32_t readBe32(const uint8_t *p) {
  return ((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) | ((uint32_t)p[2] << 8) | p[3];
}

static void drainNtpSocket() {
  while (g_ntpUdp.parsePacket() > 0) {
    while (g_ntpUdp.read() >= 0) {
    }
  }
}

// Asks one NTP server for the time. On success, *offsetMs is how far the real
// time is ahead of our clock (negative if our clock is ahead).
static bool queryNtp(const char *host, int64_t *offsetMs) {
  IPAddress ip;
  if (!WiFi.hostByName(host, ip)) return false;

  uint8_t pkt[48] = {0};
  pkt[0] = 0x23;  // NTP version 4, "client" mode
  // A random tag in the transmit field. The server copies it back, so we can
  // tell its answer apart from a late answer to an earlier question.
  uint32_t tagHi = esp_random(), tagLo = esp_random();
  for (int i = 0; i < 4; i++) {
    pkt[40 + i] = (uint8_t)(tagHi >> (24 - 8 * i));
    pkt[44 + i] = (uint8_t)(tagLo >> (24 - 8 * i));
  }

  drainNtpSocket();
  if (!g_ntpUdp.beginPacket(ip, 123)) return false;
  g_ntpUdp.write(pkt, sizeof(pkt));
  if (!g_ntpUdp.endPacket()) return false;
  uint32_t sentMs = millis();

  while (millis() - sentMs < NTP_TIMEOUT_MS) {
    if (g_ntpUdp.parsePacket() >= 48) {
      uint8_t in[48];
      int n = g_ntpUdp.read(in, sizeof(in));
      while (g_ntpUdp.read() >= 0) {  // drop anything beyond the 48 bytes
      }
      if (n != 48 || g_ntpUdp.remoteIP() != ip) continue;
      if ((in[0] & 0x07) != 4 || in[1] == 0) continue;  // not a server reply, or "go away"
      if (readBe32(in + 24) != tagHi || readBe32(in + 28) != tagLo) continue;
      uint32_t roundTripMs = millis() - sentMs;
      int64_t localMs = clockNowMs();
      uint32_t ntpSeconds = readBe32(in + 40);
      uint32_t ntpFraction = readBe32(in + 44);
      if (ntpSeconds < NTP_TO_UNIX_SECONDS) continue;
      int64_t realMs = (int64_t)(ntpSeconds - NTP_TO_UNIX_SECONDS) * 1000 +
                       (int64_t)(((uint64_t)ntpFraction * 1000) >> 32) + roundTripMs / 2;
      if (realMs < 1700000000LL * 1000) continue;  // nonsense, ignore it
      *offsetMs = realMs - localMs;
      return true;
    }
    delay(5);
  }
  return false;
}

static void resyncClock() {
  // With the network switch OFF the meter has no internet, so it keeps
  // counting on its own clock, like a real meter would.
  if (g_networkCut || WiFi.status() != WL_CONNECTED) return;
  if (!g_ntpUdpReady) g_ntpUdpReady = g_ntpUdp.begin(NTP_LOCAL_PORT) == 1;
  if (!g_ntpUdpReady) return;

  int64_t offsetMs = 0;
  bool ok = false;
  for (int attempt = 0; attempt < 2 && !ok; attempt++) {
    ok = queryNtp(NTP_SERVERS[g_ntpServer], &offsetMs);
    if (!ok) g_ntpServer = (g_ntpServer + 1) % 3;  // try the next server
  }
  if (!ok) {
    if (!g_ntpFailing) Serial.println("[time] no answer from NTP, keeping the meter's own clock for now");
    g_ntpFailing = true;
    return;
  }
  if (g_ntpFailing) Serial.println("[time] NTP answering again");
  g_ntpFailing = false;

  int64_t absMs = offsetMs < 0 ? -offsetMs : offsetMs;
  if (absMs < CLOCK_FIX_THRESHOLD_MS) return;  // close enough
  setClockMs(clockNowMs() + offsetMs);
  char when[32];
  formatUtc((uint64_t)time(nullptr), when);
  // Small gaps are normal: Wokwi often runs slower than real time, so the
  // clock loses a few seconds between readings. Big gaps mean a pause.
  const char *why = offsetMs < 0         ? ""
                    : absMs >= 30000     ? " (was the simulation paused?)"
                                         : " (Wokwi runs slower than real time)";
  Serial.printf("[time] clock was %ld.%01d s %s real time%s, corrected to %s\n",
                (long)(absMs / 1000), (int)((absMs % 1000) / 100),
                offsetMs > 0 ? "behind" : "ahead of", why, when);
}

// --- Resume after a restart -------------------------------------------------
// Wokwi has no lasting memory, so every simulation starts with empty RAM. A
// real meter keeps its lifetime totals in flash. We do the next best thing:
// after each send, the meter leaves its latest signed reading on the broker as
// a "retained" message on .../state. At boot it reads that back, checks that
// it carries ITS OWN valid signature, and carries on from those totals.
static bool g_resumeFound = false;
static SignedReading g_resume;

static void onMqttMessage(char *topic, uint8_t *payload, unsigned int length) {
  if (strcmp(topic, g_stateTopic) != 0) return;
  static char buf[1024];
  if (length == 0 || length >= sizeof(buf)) return;
  memcpy(buf, payload, length);
  buf[length] = '\0';
  SignedReading sr;
  if (!parseMessage(buf, sr) || sr.reading.meterId != METER_ID) {
    Serial.println("[resume] ignored a saved state that isn't a valid reading");
    return;
  }
  if (!verifyReading(sr)) {
    Serial.println("[resume] ignored a saved state not signed by this meter (or for another contract)");
    return;
  }
  if (!g_resumeFound || sr.reading.seq > g_resume.reading.seq) {
    g_resume = sr;
    g_resumeFound = true;
  }
}

static void fetchSavedState(const char *host) {
  g_mqtt.setServer(host, MQTT_PORT);
  if (!g_mqtt.connect(g_clientId)) {
    Serial.printf("[resume] %s unreachable (state %d)\n", host, g_mqtt.state());
    return;
  }
  g_mqtt.subscribe(g_stateTopic);
  uint32_t t0 = millis();
  while (millis() - t0 < 3000) {  // the broker sends a retained message right away
    g_mqtt.loop();
    delay(10);
  }
  g_mqtt.unsubscribe(g_stateTopic);
  g_mqtt.disconnect();
}

static void resumeFromBrokers() {
  Serial.println("[resume] looking for this meter's last saved reading on the brokers...");
  fetchSavedState(MQTT_PRIMARY_HOST);
  fetchSavedState(MQTT_FALLBACK_HOST);
  uint64_t now = (uint64_t)time(nullptr);
  if (g_resumeFound) {
    const MeterReading &r = g_resume.reading;
    g_producedWms = r.energyProducedWh * MS_PER_HOUR;
    g_soldWms = r.energySoldWh * MS_PER_HOUR;
    g_lastReadingProducedWh = r.energyProducedWh;
    g_lastReadingSoldWh = r.energySoldWh;
    char seq[21], a[28], b[28];
    Serial.printf("[resume] found seq %s: carrying on from %s Wh produced, %s Wh sold\n",
                  u64ToStr(r.seq, seq), withCommas(r.energyProducedWh, a),
                  withCommas(r.energySoldWh, b));
  } else {
    Serial.println("[resume] nothing saved yet: starting the totals from 0 Wh");
  }
  // seq must always go up, even across restarts. Starting from the current
  // Unix time guarantees that (we send far less than one reading per second).
  g_nextSeq = now;
  if (g_resumeFound && g_resume.reading.seq + 1 > g_nextSeq) g_nextSeq = g_resume.reading.seq + 1;
  char seq[21];
  Serial.printf("[resume] next seq is %s\n", u64ToStr(g_nextSeq, seq));
}

// --- Sending ----------------------------------------------------------------
static bool ensureMqtt() {
  if (g_mqtt.connected()) return true;
  if (g_wasConnected) {
    Serial.println("[mqtt] connection lost");
    g_wasConnected = false;
  }
  if (WiFi.status() != WL_CONNECTED) return false;
  if (g_lastConnectAttempt != 0 && millis() - g_lastConnectAttempt < 5000) return false;
  g_lastConnectAttempt = millis();
  const char *host = BROKERS[g_broker];
  g_mqtt.setServer(host, MQTT_PORT);
  if (g_mqtt.connect(g_clientId)) {
    Serial.printf("[mqtt] connected to %s:%d\n", host, MQTT_PORT);
    g_wasConnected = true;
    return true;
  }
  Serial.printf("[mqtt] could not reach %s (state %d), will try %s next\n", host,
                g_mqtt.state(), BROKERS[1 - g_broker]);
  g_broker = 1 - g_broker;
  return false;
}

static void saveState() {
  char msg[600];
  size_t n = buildMessage(g_lastSent, msg, sizeof(msg));
  if (n && g_mqtt.publish(g_stateTopic, msg, true)) g_stateDirty = false;
}

// Live preview for the web app: what the dials say right now, every 2 s.
// NOT signed and NOT used for payouts: only signed readings reach the oracle.
// It lets the app react to the knob within seconds while the signed proof follows.
static uint32_t g_lastLiveMs = 0;
static void publishLive() {
  if (g_networkCut || !g_mqtt.connected()) return;
  int32_t dueMs = (int32_t)(g_nextReadingMs - millis());
  if (dueMs < 0) dueMs = 0;
  char msg[256];
  int n = snprintf(msg, sizeof(msg),
                   "{\"meterId\":%lu,\"t\":%llu,\"producedW\":%lu,\"stolenW\":%lu,\"soldW\":%lu,"
                   "\"gapPct\":%u,\"theft\":%s,\"tamper\":%s,\"nextReadingS\":%ld,\"queued\":%u}",
                   (unsigned long)METER_ID, (unsigned long long)time(nullptr),
                   (unsigned long)g_producedW, (unsigned long)g_stolenW, (unsigned long)g_soldW,
                   gapPercent(g_producedW, g_soldW), looksLikeTheftNow() ? "true" : "false",
                   g_tamper ? "true" : "false", (long)((dueMs + 999) / 1000), (unsigned)g_queueCount);
  if (n > 0 && n < (int)sizeof(msg)) g_mqtt.publish(g_liveTopic, msg, false);
}

static void serviceNetwork() {
  if (g_networkCut) {
    if (g_mqtt.connected()) {
      g_mqtt.disconnect();
      Serial.println("[mqtt] network switch is OFF: link cut, readings will wait in the queue");
      g_wasConnected = false;
    }
    return;
  }
  if (!ensureMqtt()) return;
  g_mqtt.loop();

  // Send queued readings in order, a few per loop so the dials keep updating.
  int sent = 0;
  char msg[600];
  while (g_queueCount > 0 && sent < 10) {
    SignedReading &sr = queueFront();
    size_t n = buildMessage(sr, msg, sizeof(msg));
    if (n == 0) {
      Serial.println("[mqtt] ERROR: message too long, dropping it");
      queuePop();
      continue;
    }
    if (!g_mqtt.publish(g_readingTopic, msg, false)) {
      Serial.println("[mqtt] send failed, will retry");
      g_mqtt.disconnect();
      return;
    }
    char seq[21];
    Serial.printf("[mqtt] sent seq %s to %s (%u still queued)\n", u64ToStr(sr.reading.seq, seq),
                  BROKERS[g_broker], (unsigned)(g_queueCount - 1));
    g_lastSent = sr;
    g_stateDirty = true;
    queuePop();
    sent++;
  }
  if (g_queueCount == 0 && g_stateDirty) saveState();
}

// ---------------------------------------------------------------------------
// Status display
// ---------------------------------------------------------------------------
static void updateLeds() {
  bool online = !g_networkCut && g_mqtt.connected();
  digitalWrite(PIN_LED_GREEN, online && g_queueCount == 0 ? HIGH : LOW);
  digitalWrite(PIN_LED_YELLOW, !online || g_queueCount > 0 ? HIGH : LOW);
  digitalWrite(PIN_LED_RED, g_tamper || looksLikeTheftNow() ? HIGH : LOW);
}

static void printStatus() {
  char a[28], b[28], c[28], d[28];
  Serial.printf("[now] sun %s W | stolen %s W | losses %s W | sold %s W | tamper %s | network %s | queued %u%s\n",
                withCommas(g_producedW, a), withCommas(g_stolenW, b), withCommas(g_lossesW, c),
                withCommas(g_soldW, d), g_tamper ? "YES" : "no",
                g_networkCut ? "CUT" : (g_mqtt.connected() ? "online" : "connecting"),
                (unsigned)g_queueCount, looksLikeTheftNow() ? " | looks like THEFT" : "");
}

// ---------------------------------------------------------------------------
// Arduino entry points
// ---------------------------------------------------------------------------
static uint32_t g_lastSampleMs = 0, g_lastStatusMs = 0;

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("SolarShare meter (EIP-712 signed readings over MQTT)");

  pinMode(PIN_TAMPER, INPUT_PULLUP);
  pinMode(PIN_NETWORK, INPUT_PULLUP);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  digitalWrite(PIN_LED_YELLOW, HIGH);
  analogReadResolution(12);  // 0..4095; the default attenuation reads the full 0-3.3 V

  g_curve = uECC_secp256k1();
  uECC_set_rng(&espRng);
  if (!parseHex(DEVICE_PRIVATE_KEY_HEX, g_privateKey, 32) ||
      !uECC_compute_public_key(g_privateKey, g_publicKey, g_curve)) {
    Serial.println("ERROR: DEVICE_PRIVATE_KEY_HEX in secrets.h must be a valid key: 0x + 64 hex characters.");
    while (true) delay(1000);
  }
  if (!computeDomainSeparator(g_domainSeparator)) {
    Serial.println("ERROR: VERIFYING_CONTRACT must be an address: 0x + 40 hex characters.");
    while (true) delay(1000);
  }
  ethAddressChecksummed(g_publicKey, g_deviceAddress);
  snprintf(g_readingTopic, sizeof(g_readingTopic), "solarshare/meter/%lu/reading", (unsigned long)METER_ID);
  snprintf(g_stateTopic, sizeof(g_stateTopic), "solarshare/meter/%lu/state", (unsigned long)METER_ID);
  snprintf(g_liveTopic, sizeof(g_liveTopic), "solarshare/meter/%lu/live", (unsigned long)METER_ID);
  snprintf(g_clientId, sizeof(g_clientId), "solarshare-meter-%lu-%08lx", (unsigned long)METER_ID,
           (unsigned long)esp_random());

  Serial.printf("[meter] id %lu, device address %s\n", (unsigned long)METER_ID, g_deviceAddress);
  Serial.printf("[meter] signing for chain %lu, contract %s\n", (unsigned long)DOMAIN_CHAIN_ID,
                VERIFYING_CONTRACT);
  Serial.printf("[meter] one reading every %d s, topic %s\n", READING_INTERVAL_S, g_readingTopic);
  Serial.printf("[meter] quick reading when theft starts or stops; live preview every %lu s on %s\n",
                (unsigned long)(LIVE_PERIOD_MS / 1000), g_liveTopic);

  g_mqtt.setBufferSize(1024);
  g_mqtt.setCallback(onMqttMessage);
  g_mqtt.setSocketTimeout(5);

  connectWifi();
  syncTime();
  resumeFromBrokers();

  g_lastSampleMs = g_lastReadingMs = g_lastStatusMs = g_lastLiveMs = millis();
  g_nextReadingMs = g_lastReadingMs + READING_INTERVAL_MS;
  sampleAndIntegrate(0);
  g_alarmSeen = g_alarmCandidate = g_tamper || looksLikeTheftNow();
  printStatus();
}

void loop() {
  uint32_t now = millis();
  if (now - g_lastSampleMs >= SAMPLE_PERIOD_MS) {
    sampleAndIntegrate(now - g_lastSampleMs);
    g_lastSampleMs = now;
    watchForChange(now);
  }
  if ((int32_t)(now - g_nextReadingMs) >= 0) {
    makeReading();
    g_lastReadingMs = now;
    if (g_followUpPending) {
      g_followUpPending = false;
      g_nextReadingMs = now + minWindowMs();
      Serial.printf("[quick] clean reading in %lu s\n", (unsigned long)((minWindowMs() + 999) / 1000));
    } else {
      g_nextReadingMs = now + READING_INTERVAL_MS;
    }
  }
  if (now - g_lastLiveMs >= LIVE_PERIOD_MS) {
    g_lastLiveMs = now;
    publishLive();
  }
  if (now - g_lastStatusMs >= STATUS_PERIOD_MS) {
    g_lastStatusMs = now;
    printStatus();
  }
  serviceNetwork();
  updateLeds();
  delay(10);
}
