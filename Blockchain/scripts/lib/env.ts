import fs from "node:fs";
import path from "node:path";

export const ENV_PATH = path.resolve(__dirname, "..", "..", ".env");
export const ENV_EXAMPLE_PATH = path.resolve(__dirname, "..", "..", ".env.example");

/** Reads Blockchain/.env into process.env (if the file exists). */
export function loadEnv(): void {
  if (fs.existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH);
}
