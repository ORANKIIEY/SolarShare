// Recomputes the SHA-256 of each sample asset document and writes
// docs/asset-documents/hashes.json (used by deploy.ts).
//
//   npm run docs:hash
import path from "node:path";
import { DOCS_DIR, REPO_ROOT, writeHashes } from "./lib/assetDocuments";

const hashes = writeHashes();
for (const d of hashes.documents) console.log(`${d.name.padEnd(25)} ${d.sha256}  ${d.file}`);
console.log(`\nWrote ${path.relative(REPO_ROOT, path.join(DOCS_DIR, "hashes.json"))}`);
