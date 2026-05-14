// Updates version in package.json, src-tauri/tauri.conf.json, and src-tauri/Cargo.toml
// Usage: node scripts/bump-version.mjs 1.2.3

import { readFileSync, writeFileSync } from "fs";

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node scripts/bump-version.mjs <version>  (e.g. 1.2.3)");
  process.exit(1);
}

function updateJson(path, updater) {
  const obj = JSON.parse(readFileSync(path, "utf8"));
  updater(obj);
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
  console.log(`  ${path}`);
}

function updateToml(path) {
  const content = readFileSync(path, "utf8");
  const updated = content.replace(/^version = ".*?"/m, `version = "${version}"`);
  writeFileSync(path, updated);
  console.log(`  ${path}`);
}

console.log(`Bumping to ${version}:`);
updateJson("package.json", (pkg) => (pkg.version = version));
updateJson("src-tauri/tauri.conf.json", (cfg) => (cfg.version = version));
updateToml("src-tauri/Cargo.toml");
console.log("Done. Commit, push to main — auto-tag workflow will create the tag.");
