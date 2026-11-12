// Laptop-side check for the ESP32 signing spike (issue #4).
//
// 1. Paste the serial output from Wokwi (the lines between BEGIN and END)
//    into Blockchain/spike-output.txt.
// 2. Run:  npm run verify-spike
//    (or:   npm run verify-spike -- path/to/other-output.txt)
//
// The script rebuilds the same EIP-712 typed data with viem, checks that the
// device computed the same digest, and recovers the signer from (r, s) by
// trying v = 27 and v = 28, exactly like Solidity's ecrecover would.
import fs from "node:fs";
import path from "node:path";
import {
  type Address,
  type Hex,
  getAddress,
  hashDomain,
  hashStruct,
  hashTypedData,
  isAddressEqual,
  keccak256,
  recoverAddress,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { METER_READING_TYPES, SPIKE_DOMAIN } from "./lib/spike";

const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const SECP256K1_HALF_N = SECP256K1_N / 2n;
const SECRETS_H = path.resolve(__dirname, "..", "..", "Hardware", "wokwi-spike", "secrets.h");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures++;
}

function parseSerial(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    // Tolerate Wokwi/terminal prefixes such as timestamps: take "key=value".
    const m = raw.match(/([A-Za-z][A-Za-z0-9]*)=(\S.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
}

function need(fields: Record<string, string>, key: string): string {
  const v = fields[key];
  if (v === undefined) throw new Error(`"${key}=" is missing from the pasted serial output.`);
  return v;
}

function hex32(fields: Record<string, string>, key: string): Hex {
  const v = need(fields, key).toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(v)) throw new Error(`"${key}" must be 0x + 64 hex characters, got: ${v}`);
  return v as Hex;
}

/** Address from the git-ignored secrets.h, if it is on this laptop. The key is never printed. */
function addressFromSecretsH(): Address | undefined {
  if (!fs.existsSync(SECRETS_H)) return undefined;
  const m = fs.readFileSync(SECRETS_H, "utf8").match(/DEVICE_PRIVATE_KEY_HEX\s+"(0x[0-9a-fA-F]{64})"/);
  return m ? privateKeyToAccount(m[1] as Hex).address : undefined;
}

async function main() {
  const file = path.resolve(process.argv[2] ?? path.join(__dirname, "..", "spike-output.txt"));
  if (!fs.existsSync(file)) {
    console.error(`Could not find ${file}.`);
    console.error("Paste the Wokwi serial output (BEGIN ... END lines) into that file and run again.");
    process.exit(1);
  }
  const fields = parseSerial(fs.readFileSync(file, "utf8"));
  console.log(`Reading serial output from ${file}\n`);

  // 1. Domain: the device must have used the agreed domain.
  if (fields.domainName) check("domain name", fields.domainName === SPIKE_DOMAIN.name, fields.domainName);
  if (fields.domainVersion) check("domain version", fields.domainVersion === SPIKE_DOMAIN.version);
  if (fields.chainId) check("chain id is Base Sepolia (84532)", fields.chainId === String(SPIKE_DOMAIN.chainId));
  if (fields.verifyingContract) {
    check(
      "verifyingContract placeholder",
      isAddressEqual(fields.verifyingContract as Address, SPIKE_DOMAIN.verifyingContract),
    );
  }

  // 2. Rebuild the reading and the EIP-712 hashes with viem.
  const message = {
    meterId: Number(need(fields, "meterId")),
    seq: BigInt(need(fields, "seq")),
    timestamp: BigInt(need(fields, "timestamp")),
    energyProducedWh: BigInt(need(fields, "energyProducedWh")),
    energySoldWh: BigInt(need(fields, "energySoldWh")),
    powerW: Number(need(fields, "powerW")),
    tamper: need(fields, "tamper") === "true",
  };
  console.log("Reading:", message, "\n");

  const typedData = {
    domain: SPIKE_DOMAIN,
    types: METER_READING_TYPES,
    primaryType: "MeterReading",
    message,
  } as const;

  const expectedTypeHash = keccak256(
    toHex(
      "MeterReading(uint32 meterId,uint64 seq,uint64 timestamp,uint64 energyProducedWh,uint64 energySoldWh,uint32 powerW,bool tamper)",
    ),
  );
  const expectedDomainSep = hashDomain({
    domain: { ...SPIKE_DOMAIN, chainId: BigInt(SPIKE_DOMAIN.chainId) },
    types: { EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ] },
  });
  const expectedStructHash = hashStruct({ data: message, primaryType: "MeterReading", types: METER_READING_TYPES });
  const expectedDigest = hashTypedData(typedData);

  if (fields.typeHash) check("typeHash matches", hex32(fields, "typeHash") === expectedTypeHash);
  if (fields.domainSeparator) check("domainSeparator matches", hex32(fields, "domainSeparator") === expectedDomainSep);
  if (fields.structHash) check("structHash matches", hex32(fields, "structHash") === expectedStructHash);
  const deviceDigest = hex32(fields, "digest");
  check("EIP-712 digest matches viem", deviceDigest === expectedDigest, expectedDigest);

  // 3. Signature: low-s, then recover with v = 27 and v = 28.
  const r = hex32(fields, "r");
  const s = hex32(fields, "s");
  check("s is low (s <= n/2), as Ethereum/OpenZeppelin require", BigInt(s) <= SECP256K1_HALF_N);

  const deviceAddress = getAddress(need(fields, "deviceAddress"));
  let matchedV: number | undefined;
  for (const v of [27n, 28n]) {
    const signer = await recoverAddress({ hash: expectedDigest, signature: { r, s, v } });
    const hit = isAddressEqual(signer, deviceAddress);
    console.log(`      v=${v}: recovered ${signer}${hit ? "  <- device" : ""}`);
    if (hit) matchedV = Number(v);
  }
  check(
    "recovered signer equals the device address",
    matchedV !== undefined,
    matchedV !== undefined ? `(v = ${matchedV})` : "",
  );

  // 4. Independent check: the key in secrets.h on this laptop gives the same address.
  const fromSecrets = addressFromSecretsH();
  if (fromSecrets) {
    check("device address matches the key in Hardware/wokwi-spike/secrets.h", isAddressEqual(fromSecrets, deviceAddress));
  } else {
    console.log("SKIP  secrets.h not found on this laptop, so the expected address was not cross-checked");
  }

  console.log();
  if (failures === 0) {
    console.log(`All checks passed. Device address: ${deviceAddress}`);
    console.log(`Signature for Solidity: v=${matchedV}, r=${r}, s=${s}`);
  } else {
    console.log(`${failures} check(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
