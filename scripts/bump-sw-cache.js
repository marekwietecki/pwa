// Bumps sw.js's CACHE_VERSION on every build, so a deploy always invalidates
// returning visitors' cached CSS/JS instead of relying on someone remembering
// to bump it by hand (the source of several "my fix isn't showing up live"
// bugs before this existed).
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swPath = path.join(__dirname, "..", "sw.js");

const content = readFileSync(swPath, "utf8");
const version = `v${Date.now()}`;
const updated = content.replace(
  /const CACHE_VERSION = "[^"]*";/,
  `const CACHE_VERSION = "${version}";`
);

if (updated === content) {
  console.error("bump-sw-cache: CACHE_VERSION pattern not found in sw.js");
  process.exit(1);
}

writeFileSync(swPath, updated);
console.log(`bump-sw-cache: CACHE_VERSION -> ${version}`);
