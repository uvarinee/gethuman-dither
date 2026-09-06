import { createToolcraftSettingsPayload, parseToolcraftSettingsPayload } from "../toolcraft/runtime/react";
import { describe,it,expect,vi } from "vitest";
import { createToolcraftState, type ToolcraftState } from "../toolcraft/runtime";
import { appSchema } from "../app/app-schema";
import { exportConfig, snapshotEffectSettings } from "./archive";
import { validateEffectSettings } from "./settings";
import { encodeToolcraftArchive } from "../toolcraft/runtime/export/archive-export";
import { unzipSync, strFromU8 } from "fflate";
function fixture(): ToolcraftState {
  const state=createToolcraftState(appSchema);
  state.canvas.size={width:320,height:180,unit:"px"};
  state.mediaAssets=[{assetKind:"image",id:"source",fileName:"original.jpg",mimeType:"image/jpeg",layerId:"source",lifecycle:"ready",resourceRef:"source-bytes",sourceTarget:"source.image",position:{x:0,y:0},size:{width:240,height:160,unit:"px"},sourceSize:{width:600,height:400,unit:"px"},transform:{rotationDeg:90,flipHorizontal:true}}];
  return state;
}
describe("developer archive",()=>{
 it("exports original source bytes and portable settings without mutating the studio",async()=>{
  const state=fixture(), before=structuredClone(state);
  const downloadArchive=vi.fn(),feedback=vi.fn();
  const bytes=new Uint8Array([255,216,255,11,22,33]);
  await exportConfig({action:{value:"export.config"},state,dispatch:vi.fn(),reportProgress:vi.fn(),reportFeedback:feedback,resolveMediaResource:vi.fn().mockResolvedValue(bytes),downloadArchive});
  expect(feedback).not.toHaveBeenCalled();expect(downloadArchive).toHaveBeenCalledOnce();
  const request=downloadArchive.mock.calls[0][0];
  const archive=unzipSync(await encodeToolcraftArchive(request.entries));
  expect(Object.keys(archive).sort()).toEqual(["effect/LICENSE.txt","effect/README.txt","effect/demo.html","effect/effect.js","effect/image.jpg","effect/import-style.json","effect/settings.json"]);
  expect(archive["effect/image.jpg"]).toEqual(bytes);
  const studio = JSON.parse(strFromU8(archive["effect/import-style.json"]));
  expect(parseToolcraftSettingsPayload(state.schema, studio)).toEqual(studio);
  expect(studio).toEqual({ ...createToolcraftSettingsPayload(state), exportedAt: studio.exportedAt });
  expect(studio.values).not.toHaveProperty("source.image");
  const s=validateEffectSettings(JSON.parse(strFromU8(archive["effect/settings.json"])));
  expect(s.scene).toEqual({x:-80,y:-120,width:160,height:240});
  expect(s.output).toEqual({x:-160,y:-90,width:320,height:180});
  expect(s.values["pins.items"]).toEqual(state.values["pins.items"]);
  expect(s.values["pointer.return"]).toBe(state.values["pointer.return"]);
  expect(strFromU8(archive["effect/effect.js"])).toContain("createDitherEffect");
  expect(strFromU8(archive["effect/effect.js"])).not.toMatch(/from ["'](?:react|@\/toolcraft)/);
  const demo = strFromU8(archive["effect/demo.html"]);
  const embedded = JSON.parse(demo.match(/const bundle = (.*);/)![1]);
  expect(embedded.settings).toEqual(s);
  expect(Buffer.from(embedded.imageUrl.split(",")[1], "base64")).toEqual(Buffer.from(bytes));
  expect(Buffer.from(embedded.moduleUrl.split(",")[1], "base64").toString()).toBe(strFromU8(archive["effect/effect.js"]));
  expect(demo).not.toContain('fetch("./settings.json")');
  expect(demo).not.toContain("__DITHER_BUNDLE__");
  expect(state).toEqual(before);
 });
 it("snapshots edited controls before asynchronous source resolution",async()=>{
  const state=fixture();const downloadArchive=vi.fn();
  let release!:(b:Uint8Array)=>void;
  const task=exportConfig({action:{value:"export.config"},state,dispatch:vi.fn(),reportProgress:vi.fn(),reportFeedback:vi.fn(),resolveMediaResource:()=>new Promise(r=>{release=r;}),downloadArchive});
  const original=structuredClone(state.values["pins.items"]);
  state.values["pins.items"]=[]; state.values["pointer.return"]=0.04;
  release(new Uint8Array([1,2,3]));await task;
  const entry=downloadArchive.mock.calls[0][0].entries.find((e:{path:string})=>e.path.endsWith("settings.json"));
  const s=JSON.parse(strFromU8(entry.bytes));
  expect(s.values["pins.items"]).toEqual(original);expect(s.values["pointer.return"]).toBe(0.008);
  const studioEntry=downloadArchive.mock.calls[0][0].entries.find((e:{path:string})=>e.path.endsWith("import-style.json"));
  const studio=JSON.parse(strFromU8(studioEntry.bytes));
  expect(studio.values["pins.items"]).toEqual(original);
  expect(studio.values["pointer.return"]).toBe(0.008);
 });
 it("rejects invalid archive paths, duplicates and unavailable images with feedback",async()=>{
  for(const path of ["../a","/absolute","a/../../b","a\\b"]) expect(()=>encodeToolcraftArchive([{path,bytes:new Uint8Array([1])}])).toThrow();
  expect(()=>encodeToolcraftArchive([{path:"a.txt",bytes:new Uint8Array([1])},{path:"A.txt",bytes:new Uint8Array([1])}])).toThrow();
  const state=fixture();state.mediaAssets=[];
  const feedback=vi.fn(),downloadArchive=vi.fn();
  await exportConfig({action:{value:"export.config"},state,dispatch:vi.fn(),reportProgress:vi.fn(),reportFeedback:feedback,resolveMediaResource:vi.fn(),downloadArchive});
  expect(feedback).toHaveBeenCalled();expect(downloadArchive).not.toHaveBeenCalled();
 });
 it("preserves Infinity scene geometry and rejects invalid version or workload",()=>{
  const state=fixture();state.canvas.mode="infinite";
  const s=snapshotEffectSettings(state);expect(s.output).toEqual(s.scene);
  expect(()=>validateEffectSettings({...s,version:2})).toThrow();
  expect(()=>validateEffectSettings({...s,output:{...s.output,width:99999}})).toThrow();
  s.values["pins.items"]=Array(33).fill((s.values["pins.items"] as unknown[])[0]);
  expect(()=>validateEffectSettings(s)).toThrow();
 });
});
