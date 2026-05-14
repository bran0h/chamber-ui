// Serves a fake latest.json so you can test the updater UI locally.
// Usage: node scripts/mock-update-server.mjs
// Then set tauri.conf.json updater endpoint to: http://localhost:3001/latest.json

import { createServer } from "http";

const VERSION = "99.9.9"; // always higher than your current app version
const PORT = 3001;

const latest = JSON.stringify({
  version: VERSION,
  notes: "Mock update for local testing",
  pub_date: new Date().toISOString(),
  // A real URL + signature are only needed if you call downloadAndInstall().
  // check() only needs the version field to detect an update.
  url: "http://localhost:3001/mock.tar.gz",
  signature: "mock-signature",
});

createServer((req, res) => {
  console.log(`[mock-update-server] ${req.method} ${req.url}`);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(latest);
}).listen(PORT, () => {
  console.log(`Mock update server running at http://localhost:${PORT}`);
  console.log(`Reporting version: ${VERSION}`);
});
