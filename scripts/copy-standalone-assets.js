/**
 * After `next build` with output: "standalone", static files are not copied
 * automatically. This script mirrors them into .next/standalone for production.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standaloneDir = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (!fs.existsSync(standaloneDir)) {
  console.error("[jar] .next/standalone missing — run `npm run build` first.");
  process.exit(1);
}

if (!fs.existsSync(staticSrc)) {
  console.error("[jar] .next/static missing — run `npm run build` first.");
  process.exit(1);
}

copyRecursive(staticSrc, staticDest);
copyRecursive(publicSrc, publicDest);

console.log("[jar] Standalone assets copied (.next/static + public).");
