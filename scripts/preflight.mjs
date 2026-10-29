import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [major, minor] = process.versions.node.split(".").map(Number);
const supportedNode = major > 20 || (major === 20 && minor >= 9);

if (!supportedNode) {
  console.error(`Riadna requires Node.js 20.9 or newer. You are using ${process.versions.node}.`);
  console.error("Install Node 20 LTS, then run npm ci again.");
  process.exit(1);
}

const nextPackage = fileURLToPath(new URL("../node_modules/next/package.json", import.meta.url));

if (!existsSync(nextPackage)) {
  console.error("Next.js is not installed. Do not run npm i next by itself.");
  console.error("From the project root, run:");
  console.error("  npm ci");
  console.error("If npm ci fails, clear the cache and try again:");
  console.error("  npm cache clean --force");
  console.error("  npm ci");
  process.exit(1);
}
