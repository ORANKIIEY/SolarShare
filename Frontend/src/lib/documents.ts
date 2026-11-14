"use client";

import { readDocuments, sha256Hex } from "./chain";

export type DocCheck =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "done"; match: boolean; fileHash: string; chainHash: string }
  | { state: "failed" };

/**
 * Download a document from the link stored onchain, fingerprint it in the
 * browser and compare with the fingerprint stored onchain (always a fresh read).
 */
export async function verifyDocument(name: string): Promise<DocCheck> {
  try {
    const onchain = (await readDocuments()).find((c) => c.name === name);
    if (!onchain) return { state: "failed" };
    const res = await fetch(onchain.uri, { cache: "no-store" });
    if (!res.ok) return { state: "failed" };
    const fileHash = await sha256Hex(await res.arrayBuffer());
    const chainHash = onchain.sha256Hash.toLowerCase();
    return { state: "done", match: fileHash === chainHash, fileHash, chainHash };
  } catch {
    return { state: "failed" };
  }
}
