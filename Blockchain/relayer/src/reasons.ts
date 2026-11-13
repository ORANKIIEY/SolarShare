// Turns MeterOracle's revert errors into plain English for the console.
import { BaseError, ContractFunctionRevertedError, decodeErrorResult, type Hex } from "viem";
import { meterOracleAbi } from "./abi";

export interface RevertReason {
  /** The Solidity error name, e.g. "SeqNotIncreasing". */
  name: string;
  args: readonly unknown[];
  /** A sentence a non-developer can act on. */
  text: string;
}

function when(unixSeconds: unknown): string {
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return String(unixSeconds);
  return `${new Date(n * 1000).toISOString().replace(".000Z", "Z")}`;
}

export function explainError(name: string, args: readonly unknown[] = []): string {
  switch (name) {
    case "DeviceNotSet":
      return "no meter device is registered in MeterOracle yet (an admin must call setDevice)";
    case "WrongMeter":
      return `reading is for meter ${args[0]}, but this oracle is for meter ${args[1]}`;
    case "InvalidSigner":
      return `signature recovers ${args[0]}, which is not the registered meter device`;
    case "SeqNotIncreasing":
      return `seq ${args[0]} is not newer than the last accepted reading (seq ${args[1]})`;
    case "TimestampTooOld":
      return (
        `reading taken at ${when(args[0])} is too old: the oracle only accepts readings from ` +
        `${when(args[1])} on (no older than 1 hour, and not older than the previous reading)`
      );
    case "TimestampInFuture":
      return (
        `reading timestamp ${when(args[0])} is more than 5 minutes ahead of the chain clock ` +
        `(latest allowed ${when(args[1])}); check the meter's clock`
      );
    case "EnergyWentDown":
      return (
        "energy totals are lower than the last accepted reading " +
        "(did the meter restart without its saved totals?)"
      );
    case "PowerTooHigh":
      return `power ${args[0]} W is above the system's ${args[1]} W rating`;
    case "ECDSAInvalidSignature":
    case "ECDSAInvalidSignatureLength":
    case "ECDSAInvalidSignatureS":
      return "the signature is malformed";
    case "AccessControlUnauthorizedAccount":
      return `account ${args[0]} is not allowed to do this (needs an admin role)`;
    default:
      return `contract error ${name}`;
  }
}

function fromRevertData(data: unknown): RevertReason | undefined {
  if (typeof data !== "string" || !/^0x[0-9a-fA-F]{8}/.test(data)) return undefined;
  try {
    const decoded = decodeErrorResult({ abi: meterOracleAbi, data: data as Hex });
    const args = decoded.args ?? [];
    return { name: decoded.errorName, args, text: explainError(decoded.errorName, args) };
  } catch {
    return undefined;
  }
}

/** If `err` is a MeterOracle revert, say why. Otherwise undefined (e.g. a network error). */
export function revertReason(err: unknown): RevertReason | undefined {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name) {
        const args = revert.data?.args ?? [];
        return { name, args, text: explainError(name, args) };
      }
      return { name: "Reverted", args: [], text: revert.reason ?? "the contract rejected it" };
    }
  }
  // Some nodes (Hardhat in-process, a few public RPCs) return the revert in a
  // shape viem doesn't recognise. Look for the raw error data in the causes.
  for (let e: any = err, depth = 0; e && depth < 10; e = e.cause, depth++) {
    const found = fromRevertData(e.data) ?? fromRevertData(e.data?.data);
    if (found) return found;
  }
  return undefined;
}
