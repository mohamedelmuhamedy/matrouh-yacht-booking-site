import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(dirname, "../../../.env");

if (fs.existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}
