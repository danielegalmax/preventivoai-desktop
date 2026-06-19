#!/usr/bin/env node
/**
 * Genera latest.json per Tauri updater da artefatti in src-tauri/target/release/bundle/
 *
 * Uso:
 *   node scripts/generate-latest-json.mjs 0.1.1 "Note release" https://github.com/org/repo/releases/download/v0.1.1
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const bundleRoot = path.join(root, "src-tauri", "target", "release", "bundle");

const [version, notes = "", baseUrl = ""] = process.argv.slice(2);

if (!version || !baseUrl) {
  console.error(
    "Uso: node scripts/generate-latest-json.mjs <versione> [note] <url_base_release>",
  );
  process.exit(1);
}

function readSig(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8").trim();
}

function findFile(dir, pattern) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && pattern.test(entry.name)) return full;
  }
  return null;
}

const platforms = {};

const nsisDir = path.join(bundleRoot, "nsis");
const nsisExe = findFile(nsisDir, /\.exe$/i);
if (nsisExe && !nsisExe.endsWith(".sig")) {
  const sig = readSig(`${nsisExe}.sig`);
  if (sig) {
    platforms["windows-x86_64"] = {
      url: `${baseUrl.replace(/\/$/, "")}/${path.basename(nsisExe)}`,
      signature: sig,
    };
  }
}

const msiDir = path.join(bundleRoot, "msi");
const msi = findFile(msiDir, /\.msi$/i);
if (msi) {
  const sig = readSig(`${msi}.sig`);
  if (sig && !platforms["windows-x86_64"]) {
    platforms["windows-x86_64"] = {
      url: `${baseUrl.replace(/\/$/, "")}/${path.basename(msi)}`,
      signature: sig,
    };
  }
}

const macDir = path.join(bundleRoot, "macos");
const macTar = findFile(macDir, /\.tar\.gz$/i);
if (macTar) {
  const sig = readSig(`${macTar}.sig`);
  if (sig) {
    platforms["darwin-x86_64"] = {
      url: `${baseUrl.replace(/\/$/, "")}/${path.basename(macTar)}`,
      signature: sig,
    };
    platforms["darwin-aarch64"] = platforms["darwin-x86_64"];
  }
}

const appImageDir = path.join(bundleRoot, "appimage");
const appImage = findFile(appImageDir, /\.AppImage$/i);
if (appImage) {
  const sig = readSig(`${appImage}.sig`);
  if (sig) {
    platforms["linux-x86_64"] = {
      url: `${baseUrl.replace(/\/$/, "")}/${path.basename(appImage)}`,
      signature: sig,
    };
  }
}

if (Object.keys(platforms).length === 0) {
  console.error("Nessun artefatto firmato trovato. Esegui prima: npm run tauri build");
  process.exit(1);
}

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms,
};

const outPath = path.join(root, "latest.json");
fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Scritto ${outPath}`);
console.log(JSON.stringify(manifest, null, 2));
