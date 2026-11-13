// The three SAMPLE asset documents (#27) and their SHA-256 hashes.
//
// The PDFs live in docs/asset-documents/ (repo root). scripts/build-asset-documents.ts
// makes them; scripts/hash-asset-documents.ts writes hashes.json; deploy.ts
// records each hash in SolarShareToken with setDocument(name, sha256, uri).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Hex } from "viem";

export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
export const DOCS_DIR = path.join(REPO_ROOT, "docs", "asset-documents");
export const HASHES_PATH = path.join(DOCS_DIR, "hashes.json");

/**
 * Where people download the files from. For now: the GitHub raw URL on main.
 * Production would pin each file to IPFS instead (an ipfs:// URI is itself
 * derived from the content, so it can never point at a different file).
 */
export const RAW_BASE_URL = "https://raw.githubusercontent.com/ORANKIIEY/SolarShare/main/docs/asset-documents";

export interface AssetDocumentSpec {
  /** The name stored onchain (SolarShareToken.getDocument(name)). */
  name: "SPV_CERTIFICATE" | "INSTALLATION_CERTIFICATE" | "POWER_PURCHASE_AGREEMENT";
  file: string;
  title: string;
}

export const ASSET_DOCUMENTS: AssetDocumentSpec[] = [
  { name: "SPV_CERTIFICATE", file: "spv-company-certificate.pdf", title: "SPV company certificate" },
  { name: "INSTALLATION_CERTIFICATE", file: "installation-certificate.pdf", title: "Installation certificate" },
  { name: "POWER_PURCHASE_AGREEMENT", file: "power-purchase-agreement.pdf", title: "Power purchase agreement" },
];

export interface HashedDocument extends AssetDocumentSpec {
  /** SHA-256 of the file as 0x + 64 hex, ready for bytes32. */
  sha256: Hex;
  bytes: number;
  uri: string;
}

export interface HashesFile {
  algorithm: "sha256";
  note: string;
  documents: HashedDocument[];
}

export function sha256File(file: string): Hex {
  return `0x${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}

/** Hashes the PDFs on disk and writes hashes.json. */
export function writeHashes(): HashesFile {
  const documents = ASSET_DOCUMENTS.map((spec) => {
    const file = path.join(DOCS_DIR, spec.file);
    if (!fs.existsSync(file)) {
      throw new Error(`Missing ${path.relative(REPO_ROOT, file)}. Run \`npm run docs:build\` first.`);
    }
    return { ...spec, sha256: sha256File(file), bytes: fs.statSync(file).size, uri: `${RAW_BASE_URL}/${spec.file}` };
  });
  const out: HashesFile = {
    algorithm: "sha256",
    note:
      "SAMPLE documents for the SolarShare hackathon demo, not real legal documents. " +
      "Each sha256 is recorded onchain in SolarShareToken (getDocuments). " +
      "Rebuild with `npm run docs:build` in Blockchain/.",
    documents,
  };
  fs.writeFileSync(HASHES_PATH, JSON.stringify(out, null, 2) + "\n");
  return out;
}

/**
 * Reads hashes.json and checks every file on disk still has that hash.
 * Returns the documents plus a list of problems (empty = all good).
 */
export function readHashes(): { documents: HashedDocument[]; problems: string[] } {
  const problems: string[] = [];
  if (!fs.existsSync(HASHES_PATH)) {
    return { documents: [], problems: [`${path.relative(REPO_ROOT, HASHES_PATH)} is missing. Run \`npm run docs:build\`.`] };
  }
  const json = JSON.parse(fs.readFileSync(HASHES_PATH, "utf8")) as HashesFile;
  for (const spec of ASSET_DOCUMENTS) {
    const doc = json.documents?.find((d) => d.name === spec.name);
    if (!doc) {
      problems.push(`hashes.json has no entry for ${spec.name}. Run \`npm run docs:hash\`.`);
      continue;
    }
    const file = path.join(DOCS_DIR, doc.file);
    if (!fs.existsSync(file)) problems.push(`${doc.file} is missing. Run \`npm run docs:build\`.`);
    else if (sha256File(file) !== doc.sha256) {
      problems.push(`${doc.file} changed since hashes.json was written. Run \`npm run docs:hash\`.`);
    }
    if (!/^0x[0-9a-f]{64}$/.test(doc.sha256 ?? "")) problems.push(`${spec.name}: sha256 is not 32 bytes of hex.`);
  }
  return { documents: json.documents ?? [], problems };
}
