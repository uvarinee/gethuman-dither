import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyLocalToolcraftFork } from "./local-toolcraft-fork.mjs";
async function fixture(t, files) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"dither-fork-"));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,"docs"));
 await fs.writeFile(path.join(root,"docs/local-toolcraft-fork.json"),JSON.stringify({kind:"user-maintained-local-fork",version:1,files}));
 return root;
}
const original="a".repeat(64), replacement="b".repeat(64);
test("local fork substitutes only approved hashes and leaves other authority unchanged",async t=>{
 const root=await fixture(t,[{path:"vite.config.ts",upstreamSha256:original,sha256:replacement}]);
 const untouched={expectedHash:original,filePath:"other"};
 const protectedFiles=new Map([["vite.config.ts",{expectedHash:original}],["other",untouched]]);
 await applyLocalToolcraftFork(root,new Map(),protectedFiles);
 assert.equal(protectedFiles.get("vite.config.ts").expectedHash,replacement);
 assert.equal(protectedFiles.get("other"),untouched);
});
test("local fork rejects an unrelated runtime file",async t=>{
 const root=await fixture(t,[{path:"src/toolcraft/runtime/state.ts",upstreamSha256:null,sha256:replacement}]);
 await assert.rejects(applyLocalToolcraftFork(root,new Map(),new Map()),/Unapproved/);
});
test("local fork rejects a mismatching upstream hash",async t=>{
 const root=await fixture(t,[{path:"vite.config.ts",upstreamSha256:null,sha256:replacement}]);
 await assert.rejects(applyLocalToolcraftFork(root,new Map(),new Map([["vite.config.ts",{expectedHash:original}]])),/upstream hash mismatch/);
});
