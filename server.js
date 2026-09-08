/**
 * Optional standalone entry (cPanel / manual deploy).
 * Liara uses `npm start` → `next start` — see README.md.
 */

const path = require("path");
const fs = require("fs");

const standaloneDir = path.join(__dirname, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");

if (!fs.existsSync(standaloneServer)) {
  console.error(
    "[jar] .next/standalone/server.js not found. Run `npm run build` first."
  );
  process.exit(1);
}

process.env.NODE_ENV = "production";
process.env.PORT = process.env.PORT || "3000";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

// Standalone server resolves paths relative to its working directory.
process.chdir(standaloneDir);
require(standaloneServer);
