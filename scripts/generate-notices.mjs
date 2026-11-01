// Generates public/THIRD_PARTY_NOTICES.txt from the production dependency tree
// (licence + licence text of every package, read from node_modules).
// Runs automatically before `npm start` and `npm run build`.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "public", "THIRD_PARTY_NOTICES.txt");
const lgplFile = join(root, "scripts", "LGPL-2.1.txt"); // full licence text, added by hand

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// This application's source, from its own package.json (`repository`), so the address is written down once.
const SOURCE_URL = repoOf(readJson(join(root, "package.json")));

// node_modules/<name> looked up from `from`, walking up the directory tree.
function findPackageDir(name, from) {
  let dir = from;
  for (;;) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function licenseOf(pkg) {
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(" OR ");
  return "UNKNOWN";
}

function repoOf(pkg) {
  const url = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  if (!url) return pkg.homepage ?? "";
  return url
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^github:/, "https://github.com/")
    .replace(/\.git$/, "");
}

function licenseTextOf(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /^(licen[cs]e|copying|notice)([-_.].*)?$/i.test(e.name))
    .map((e) => readFileSync(join(dir, e.name), "utf8").trim())
    .join("\n\n");
}

// ---- walk the production dependency tree ----
const rootPkg = readJson(join(root, "package.json"));
const packages = new Map();
const missing = [];
const queue = Object.keys(rootPkg.dependencies ?? {}).map((name) => ({
  name,
  from: root,
  optional: false,
}));

while (queue.length) {
  const { name, from, optional } = queue.shift();
  const dir = findPackageDir(name, from);
  if (!dir) {
    if (!optional) missing.push(name);
    continue;
  }
  const pkg = readJson(join(dir, "package.json"));
  const key = `${pkg.name}@${pkg.version}`;
  if (packages.has(key)) continue;
  packages.set(key, {
    name: pkg.name,
    version: pkg.version,
    license: licenseOf(pkg),
    repo: repoOf(pkg),
    text: licenseTextOf(dir),
  });
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    queue.push({ name: dep, from: dir, optional: false });
  }
  for (const dep of Object.keys(pkg.optionalDependencies ?? {})) {
    queue.push({ name: dep, from: dir, optional: true });
  }
}

// ---- write the file ----
const line = "=".repeat(72);
const thin = "-".repeat(72);

let out = `THIRD-PARTY NOTICES
${line}

This application is MIT licensed. It is built on the open-source software
listed below. The list covers the whole production dependency tree, so it may
include packages that are only partly used or not shipped to the browser.

OPEN CASCADE TECHNOLOGY
${thin}
This application uses Open CASCADE Technology (OCCT), Copyright (c)
OPEN CASCADE S.A.S., which is licensed under the GNU Lesser General Public
License (LGPL) version 2.1 with the Open CASCADE exception 1.0.

You have rights in this regard according to the LGPL, including the right to
obtain the library's source code and to replace the library with a modified
version. OCCT reaches your browser as a separate WebAssembly (.wasm) file
built by the replicad-opencascadejs package.

  OCCT source and licence:  https://dev.opencascade.org
  WebAssembly build:        https://github.com/sgenoud/replicad
  Build toolchain:          https://github.com/donalffons/opencascade.js
${SOURCE_URL ? `  This application:         ${SOURCE_URL}\n` : ""}  LGPL 2.1 text:           https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html

`;

if (existsSync(lgplFile)) {
  out += `${thin}\nGNU LESSER GENERAL PUBLIC LICENSE, VERSION 2.1\n${thin}\n${readFileSync(lgplFile, "utf8").trim()}\n\n`;
}

out += `PACKAGES\n${line}\n\n`;
const sorted = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name));
for (const p of sorted) {
  out += `${p.name} ${p.version} (${p.license})\n`;
  if (p.repo) out += `${p.repo}\n`;
  out += `${thin}\n${p.text || "(No licence file shipped in the package; see the repository above.)"}\n\n`;
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, out);

console.log(`Wrote public/THIRD_PARTY_NOTICES.txt (${sorted.length} packages)`);
const unknown = sorted.filter((p) => p.license === "UNKNOWN").map((p) => p.name);
if (unknown.length) console.warn(`warning: no licence field for: ${unknown.join(", ")}`);
if (missing.length) console.warn(`warning: not found in node_modules (run npm install?): ${missing.join(", ")}`);
if (!existsSync(lgplFile)) {
  console.warn("warning: scripts/LGPL-2.1.txt not found; the notices link to the LGPL text instead of including it");
}
