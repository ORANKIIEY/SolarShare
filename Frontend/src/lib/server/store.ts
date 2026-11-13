// Investor applications (the mocked ID check), kept in a small JSON file on
// the server: Frontend/.data/applicants.json (git-ignored). Demo only: a real
// platform would keep this with the licensed ID-check partner.
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Address } from "viem";

export type ApplicantStatus = "pending" | "approved" | "rejected";

export interface Applicant {
  address: Address;
  name: string;
  phoneLast4: string; // never the full number
  status: ApplicantStatus;
  createdAt: number;
  updatedAt: number;
  txHash?: string;
}

const FILE = path.join(process.cwd(), ".data", "applicants.json");
let queue: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<Applicant[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Applicant[];
  } catch {
    return [];
  }
}

async function writeAll(list: Applicant[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2));
}

/** One change at a time, so two requests never overwrite each other. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

export const listApplicants = () => readAll();

export async function getApplicant(address: Address): Promise<Applicant | undefined> {
  return (await readAll()).find((a) => a.address.toLowerCase() === address.toLowerCase());
}

export function upsertApplicant(a: Pick<Applicant, "address" | "name" | "phoneLast4">): Promise<Applicant> {
  return serial(async () => {
    const list = await readAll();
    const now = Date.now();
    const i = list.findIndex((x) => x.address.toLowerCase() === a.address.toLowerCase());
    const row: Applicant =
      i >= 0
        ? { ...list[i], name: a.name, phoneLast4: a.phoneLast4, updatedAt: now }
        : { ...a, status: "pending", createdAt: now, updatedAt: now };
    if (i >= 0) list[i] = row;
    else list.push(row);
    await writeAll(list);
    return row;
  });
}

export function setApplicantStatus(address: Address, status: ApplicantStatus, txHash?: string): Promise<Applicant | undefined> {
  return serial(async () => {
    const list = await readAll();
    const row = list.find((x) => x.address.toLowerCase() === address.toLowerCase());
    if (!row) return undefined;
    row.status = status;
    row.updatedAt = Date.now();
    if (txHash) row.txHash = txHash;
    await writeAll(list);
    return row;
  });
}
