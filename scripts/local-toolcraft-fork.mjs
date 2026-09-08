import fs from "node:fs/promises";
import path from "node:path";
const allowed = new Set(["AGENTS.md","vite.config.ts","scripts/check-toolcraft-integrity.mjs",
  "src/toolcraft/runtime/export/artifact-download.ts","src/toolcraft/runtime/export/archive-export.ts",
  "src/toolcraft/runtime/react/controls-panel/actions/controls-panel-actions.ts"]);
export async function applyLocalToolcraftFork(rootDir, runtimeFiles, protectedFiles) {
  let fork;
  try { fork = JSON.parse(await fs.readFile(path.join(rootDir,"docs/local-toolcraft-fork.json"),"utf8")); }
  catch(error) { if(error.code === "ENOENT") return; throw error; }
  if (fork.kind !== "user-maintained-local-fork" || fork.version !== 1 || !Array.isArray(fork.files)) throw new Error("Invalid local fork manifest.");
  const seen = new Set();
  for(const entry of fork.files) {
    if(!allowed.has(entry.path) || seen.has(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error("Unapproved local fork entry: " + entry.path);
    seen.add(entry.path);
    const runtime = entry.path.startsWith("src/toolcraft/");
    const key = runtime ? entry.path.slice("src/toolcraft/".length) : entry.path;
    const map = runtime ? runtimeFiles : protectedFiles;
    const original = map.get(key);
    if ((original?.expectedHash ?? null) !== entry.upstreamSha256) throw new Error("Local fork upstream hash mismatch: " + entry.path);
    map.set(key,{expectedHash:entry.sha256,filePath:path.join(rootDir,...entry.path.split("/"))});
  }
  console.log("Verifying user-maintained Toolcraft ZIP fork (not an upstream release).");
}
