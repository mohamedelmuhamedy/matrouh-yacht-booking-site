import fs from "node:fs";
import path from "node:path";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
];

const rootEnvPath = envCandidates.find((candidate) => fs.existsSync(candidate));

if (rootEnvPath) {
  process.loadEnvFile(rootEnvPath);
}
