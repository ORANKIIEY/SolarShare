/*
 * SolarShare: meter signing spike (GitHub issue #4)
 * --------------------------------------------------
 * Proves that an ESP32 can sign a meter reading in a way an Ethereum smart
 * contract can check with ecrecover:
 *
 *   1. Build an EIP-712 typed-data digest for one hard-coded MeterReading.
 *   2. Hash with Keccak-256 (Ethereum's hash, NOT the standard SHA3-256).
 *   3. Sign the digest with secp256k1 (micro-ecc library).
 *   4. Print the reading, the digest, r, s and the device's Ethereum address.
 *
 * Then run `npm run verify-spike` in Blockchain/ to check it with viem.
 *
 * The device key lives in secrets.h (git-ignored). TESTNET / DEMO ONLY.
 */

#include <Arduino.h>
#include <string.h>
#include <uECC.h>

#if __has_include("esp_random.h")
#include "esp_random.h"
#else
#include "esp_system.h"
#endif

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Missing secrets.h. Create a file called secrets.h with: #define DEVICE_PRIVATE_KEY_HEX \"0x...\" (see README)."
#endif

// ---------------------------------------------------------------------------
// EIP-712 domain. verifyingContract is a FIXED PLACEHOLDER for this spike.
// The real MeterOracle address replaces it once that contract is deployed.
// ---------------------------------------------------------------------------
static const char *DOMAIN_NAME = "SolarShare MeterOracle";
static const char *DOMAIN_VERSION = "1";
static const uint64_t DOMAIN_CHAIN_ID = 84532;  // Base Sepolia
static const char *DOMAIN_VERIFYING_CONTRACT = "0x1111111111111111111111111111111111111111";

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

// The one hard-coded reading this spike signs.
static const MeterReading READING = {
    /* meterId          */ 1,
    /* seq              */ 42,
    /* timestamp        */ 1794571200ULL,  // 2026-11-13 12:00:00 UTC
    /* energyProducedWh */ 12345678ULL,
    /* energySoldWh     */ 9876543ULL,
    /* powerW           */ 3250,
    /* tamper           */ false,
};

// ---------------------------------------------------------------------------
// Keccak-256 (Ethereum flavour). Written for this project from the Keccak
// specification. Ethereum's Keccak-256 pads with 0x01; SHA3-256 pads with
// 0x06. Using the wrong one gives a completely different hash.
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
    // Theta
    for (int i = 0; i < 5; i++) bc[i] = st[i] ^ st[i + 5] ^ st[i + 10] ^ st[i + 15] ^ st[i + 20];
    for (int i = 0; i < 5; i++) {
      uint64_t t = bc[(i + 4) % 5] ^ rotl64(bc[(i + 1) % 5], 1);
      for (int j = 0; j < 25; j += 5) st[j + i] ^= t;
    }
    // Rho and Pi
    uint64_t t = st[1];
    for (int i = 0; i < 24; i++) {
      int j = KECCAK_PI[i];
      uint64_t tmp = st[j];
      st[j] = rotl64(t, KECCAK_ROT[i]);
      t = tmp;
    }
    // Chi
    for (int j = 0; j < 25; j += 5) {
      for (int i = 0; i < 5; i++) bc[i] = st[j + i];
      for (int i = 0; i < 5; i++) st[j + i] ^= (~bc[(i + 1) % 5]) & bc[(i + 2) % 5];
    }
    // Iota
    st[0] ^= KECCAK_RC[round];
  }
}

static inline void keccakXorByte(uint64_t st[25], size_t pos, uint8_t b) {
  st[pos / 8] ^= (uint64_t)b << (8 * (pos % 8));
}

static void keccak256(const uint8_t *data, size_t len, uint8_t out[32]) {
  const size_t RATE = 136;  // (1600 - 2*256) / 8
  uint64_t st[25];
  memset(st, 0, sizeof(st));
  while (len >= RATE) {
    for (size_t i = 0; i < RATE; i++) keccakXorByte(st, i, data[i]);
    keccakF1600(st);
    data += RATE;
    len -= RATE;
  }
  for (size_t i = 0; i < len; i++) keccakXorByte(st, i, data[i]);
  keccakXorByte(st, len, 0x01);  // Keccak padding (SHA3-256 would use 0x06)
  keccakXorByte(st, RATE - 1, 0x80);
  keccakF1600(st);
  for (size_t i = 0; i < 32; i++) out[i] = (uint8_t)(st[i / 8] >> (8 * (i % 8)));
}

static void keccak256Str(const char *s, uint8_t out[32]) {
  keccak256((const uint8_t *)s, strlen(s), out);
}

// ---------------------------------------------------------------------------
// Small helpers: hex, ABI words, printing 64-bit numbers.
// ---------------------------------------------------------------------------
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

static void printHex(const uint8_t *data, size_t len) {
  static const char *DIGITS = "0123456789abcdef";
  Serial.print("0x");
  for (size_t i = 0; i < len; i++) {
    Serial.print(DIGITS[data[i] >> 4]);
    Serial.print(DIGITS[data[i] & 0x0f]);
  }
}

static void printU64(uint64_t v) {
  char buf[21];
  int i = 20;
  buf[i] = '\0';
  do {
    buf[--i] = (char)('0' + (v % 10));
    v /= 10;
  } while (v > 0);
  Serial.print(&buf[i]);
}

static void printField(const char *name, const uint8_t *data, size_t len) {
  Serial.print(name);
  Serial.print("=");
  printHex(data, len);
  Serial.println();
}

static void printFieldU64(const char *name, uint64_t v) {
  Serial.print(name);
  Serial.print("=");
  printU64(v);
  Serial.println();
}

// ABI-encodes an unsigned integer as a 32-byte big-endian word.
static void abiUint(uint8_t word[32], uint64_t v) {
  memset(word, 0, 32);
  for (int i = 0; i < 8; i++) word[31 - i] = (uint8_t)(v >> (8 * i));
}

// ---------------------------------------------------------------------------
// EIP-712 hashing
// ---------------------------------------------------------------------------
static void domainSeparator(uint8_t out[32]) {
  uint8_t enc[5 * 32];
  uint8_t addr[20];
  keccak256Str(EIP712_DOMAIN_TYPE, enc);
  keccak256Str(DOMAIN_NAME, enc + 32);
  keccak256Str(DOMAIN_VERSION, enc + 64);
  abiUint(enc + 96, DOMAIN_CHAIN_ID);
  memset(enc + 128, 0, 32);
  parseHex(DOMAIN_VERIFYING_CONTRACT, addr, 20);
  memcpy(enc + 128 + 12, addr, 20);  // address is right-aligned in its word
  keccak256(enc, sizeof(enc), out);
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
static void eip712Digest(const uint8_t domSep[32], const uint8_t sHash[32], uint8_t out[32]) {
  uint8_t buf[66];
  buf[0] = 0x19;
  buf[1] = 0x01;
  memcpy(buf + 2, domSep, 32);
  memcpy(buf + 34, sHash, 32);
  keccak256(buf, sizeof(buf), out);
}

// ---------------------------------------------------------------------------
// secp256k1 helpers
// ---------------------------------------------------------------------------
static int espRng(uint8_t *dest, unsigned size) {
  while (size > 0) {
    uint32_t r = esp_random();
    for (int i = 0; i < 4 && size > 0; i++, size--) *dest++ = (uint8_t)(r >> (8 * i));
  }
  return 1;
}

// Curve order n and n/2 (big-endian).
static const uint8_t SECP256K1_N[32] = {
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe,
    0xba, 0xae, 0xdc, 0xe6, 0xaf, 0x48, 0xa0, 0x3b, 0xbf, 0xd2, 0x5e, 0x8c, 0xd0, 0x36, 0x41, 0x41};
static const uint8_t SECP256K1_HALF_N[32] = {
    0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0x5d, 0x57, 0x6e, 0x73, 0x57, 0xa4, 0x50, 0x1d, 0xdf, 0xe9, 0x2f, 0x46, 0x68, 0x1b, 0x20, 0xa0};

// Ethereum (and OpenZeppelin's ECDSA library) only accept "low-s" signatures
// (s <= n/2). If s is high, replace it with n - s; the signature stays valid
// for the same key, only the recovery bit v flips.
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

// Ethereum address = last 20 bytes of keccak256(64-byte uncompressed public key).
static void ethAddress(const uint8_t pub[64], uint8_t addr[20]) {
  uint8_t h[32];
  keccak256(pub, 64, h);
  memcpy(addr, h + 12, 20);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
static bool keccakSelfTest() {
  // keccak256("") is a well-known Ethereum constant.
  static const uint8_t EMPTY[32] = {0xc5, 0xd2, 0x46, 0x01, 0x86, 0xf7, 0x23, 0x3c, 0x92, 0x7e, 0x7d,
                                    0xb2, 0xdc, 0xc7, 0x03, 0xc0, 0xe5, 0x00, 0xb6, 0x53, 0xca, 0x82,
                                    0x27, 0x3b, 0x7b, 0xfa, 0xd8, 0x04, 0x5d, 0x85, 0xa4, 0x70};
  uint8_t h[32];
  keccak256((const uint8_t *)"", 0, h);
  return memcmp(h, EMPTY, 32) == 0;
}

static void runSpike() {
  const struct uECC_Curve_t *curve = uECC_secp256k1();
  uECC_set_rng(&espRng);

  uint8_t priv[32], pub[64], addr[20];
  if (!parseHex(DEVICE_PRIVATE_KEY_HEX, priv, 32)) {
    Serial.println("ERROR: DEVICE_PRIVATE_KEY_HEX in secrets.h must be 0x + 64 hex characters.");
    return;
  }
  if (!uECC_compute_public_key(priv, pub, curve)) {
    Serial.println("ERROR: the device private key is not a valid secp256k1 key.");
    return;
  }
  ethAddress(pub, addr);

  uint8_t domSep[32], sHash[32], digest[32], typeHash[32];
  keccak256Str(METER_READING_TYPE, typeHash);
  domainSeparator(domSep);
  structHash(READING, sHash);
  eip712Digest(domSep, sHash, digest);

  uint8_t sig[64];  // r (32 bytes) || s (32 bytes)
  uint32_t t0 = micros();
  int ok = uECC_sign(priv, digest, 32, sig, curve);
  uint32_t signMicros = micros() - t0;
  memset(priv, 0, sizeof(priv));
  if (!ok) {
    Serial.println("ERROR: uECC_sign failed.");
    return;
  }
  bool flipped = normalizeLowS(sig + 32);
  bool verified = uECC_verify(pub, digest, 32, sig, curve) == 1;

  Serial.println("--- BEGIN SOLARSHARE SPIKE ---");
  Serial.print("domainName=");
  Serial.println(DOMAIN_NAME);
  Serial.print("domainVersion=");
  Serial.println(DOMAIN_VERSION);
  printFieldU64("chainId", DOMAIN_CHAIN_ID);
  Serial.print("verifyingContract=");
  Serial.println(DOMAIN_VERIFYING_CONTRACT);
  printFieldU64("meterId", READING.meterId);
  printFieldU64("seq", READING.seq);
  printFieldU64("timestamp", READING.timestamp);
  printFieldU64("energyProducedWh", READING.energyProducedWh);
  printFieldU64("energySoldWh", READING.energySoldWh);
  printFieldU64("powerW", READING.powerW);
  Serial.print("tamper=");
  Serial.println(READING.tamper ? "true" : "false");
  printField("typeHash", typeHash, 32);
  printField("domainSeparator", domSep, 32);
  printField("structHash", sHash, 32);
  printField("digest", digest, 32);
  printField("r", sig, 32);
  printField("s", sig + 32, 32);
  printField("deviceAddress", addr, 20);
  printField("devicePublicKey", pub, 64);
  Serial.println("--- END SOLARSHARE SPIKE ---");
  Serial.print("info: keccak self-test ");
  Serial.println(keccakSelfTest() ? "passed" : "FAILED");
  Serial.print("info: on-device signature check ");
  Serial.println(verified ? "passed" : "FAILED");
  Serial.print("info: s was high and was normalised to low-s: ");
  Serial.println(flipped ? "yes" : "no");
  Serial.print("info: signing took ");
  Serial.print(signMicros / 1000.0, 1);
  Serial.println(" ms (simulated time)");
  Serial.println("info: copy the lines from BEGIN to END into Blockchain/spike-output.txt,");
  Serial.println("      then run `npm run verify-spike` in Blockchain/.");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("SolarShare meter signing spike (EIP-712 + Keccak-256 + secp256k1)");
  runSpike();
}

void loop() {
  delay(1000);
}
