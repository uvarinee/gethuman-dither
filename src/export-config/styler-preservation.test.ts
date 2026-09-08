import { it,expect } from "vitest";
import fs from "node:fs";
import crypto from "node:crypto";
import baseline from "../../docs/styler-baseline.json";
it("preserves the released styler renderer, physics, pins, controls and preview exactly",()=>{
 for(const [file,expected] of Object.entries(baseline.files)) {
  const hash=crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  expect(hash,file).toBe(expected);
 }
 const source=fs.readFileSync("src/dither/dither-settings.ts","utf8");
 expect(crypto.createHash("sha256").update(source).digest("hex")).toBe(baseline.portableSettingsSha256);
});
