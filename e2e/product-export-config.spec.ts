import { test as playwrightTest } from "@playwright/test";
import { test, expect } from "./toolcraft-product-test";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { prepareDither, ditherOutput, seekDitherPhase, setDitherSwitch } from "./product-dither-helpers";
import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import { unzipSync, strFromU8 } from "fflate";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import type { createDitherEffect } from "../src/export-config/player";
type EffectWindow = Window & { effect: Awaited<ReturnType<typeof createDitherEffect>> };
import type { EffectSettings } from "../src/export-config/settings";

test("browser: Export Config reproduces the studio in an independent browser page",async({page})=>{
 const session=await prepareDither(page);
 await seekDitherPhase(page,0.23);
 await setDitherSwitch(page,"pointer.enabled",true);
 await page.mouse.move(1,1);
 const archive = await expectToolcraftExportedArtifact(
  session.targetAction("actions.output",async()=>{
   const pending=page.waitForEvent("download");
   await page.getByRole("button",{name:"Export Config",exact:true}).click();
   return pending;
  }),
  async(download)=>{
   expect(download.suggestedFilename()).toBe("interactive-dither-effect.zip");
   const bytes=await fs.readFile((await download.path())!);
   const entries=unzipSync(bytes);
   expect(Object.keys(entries).sort()).toEqual(["effect/LICENSE.txt","effect/README.txt","effect/demo.html","effect/effect.js","effect/image.png","effect/import-style.json","effect/settings.json"]);
   expect(entries["effect/image.png"].slice(0,8)).toEqual(new Uint8Array([137,80,78,71,13,10,26,10]));
   expect(strFromU8(entries["effect/effect.js"])).not.toMatch(/from ["'](?:react|@\/toolcraft)/);
   return {byteLength:bytes.length,mediaType:"application/zip",contentHash:crypto.createHash("sha256").update(bytes).digest("hex")};
  },{requirementId:"export.config"});
 const entries=unzipSync(await fs.readFile((await archive.path())!));
 const settings=JSON.parse(strFromU8(entries["effect/settings.json"])) as EffectSettings;
 // Snapshot actual studio pixels in the same authored artboard coordinates.
 const expected=await page.locator(ditherOutput).evaluate((element,s)=>{
  const original=element as HTMLCanvasElement;
  const scale=original.width/s.scene.width;
  const canvas=document.createElement("canvas");canvas.width=Math.round(s.output.width*scale);canvas.height=Math.round(s.output.height*scale);
  const c=canvas.getContext("2d")!;
  if(s.includeBackground){c.fillStyle=s.values["appearance.background"] as string;c.fillRect(0,0,canvas.width,canvas.height);}
  c.drawImage(original,(s.scene.x-s.output.x)*scale,(s.scene.y-s.output.y)*scale);
  return {pixels:Array.from(c.getImageData(0,0,canvas.width,canvas.height).data),width:canvas.width,height:canvas.height};
 },settings);
 const proofHtml=`<!doctype html><style>body{margin:0}#host{width:${settings.output.width}px}</style><div id="host"></div><script type="module">
 import {createDitherEffect} from "./effect.js";
 const settings=await fetch("./settings.json").then(r=>r.json());
 window.effect=await createDitherEffect({container:document.querySelector("#host"),settings,autoplay:false});
 </script>`;
 const server=createServer((req,res)=>{
  const name=new URL(req.url!,"http://localhost").pathname.slice(1);
  const data=name==="proof.html"?new TextEncoder().encode(proofHtml):entries["effect/"+name];
  if(!data){res.writeHead(404);res.end();return;}
  res.setHeader("Content-Type",name.endsWith(".js")?"text/javascript":name.endsWith(".html")?"text/html":name.endsWith(".json")?"application/json":name.endsWith(".png")?"image/png":"text/plain");
  res.end(data);
 });
 await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
 const port=(server.address() as {port:number}).port;
 const standalone=await page.context().newPage();
 const errors:string[]=[];standalone.on("pageerror",e=>errors.push(e.message));
 try {
  // Open only the exported HTML from disk, offline, without sibling files.
  const localDemo = playwrightTest.info().outputPath("offline-demo.html");
  await fs.mkdir(path.dirname(localDemo), { recursive: true });
  await fs.writeFile(localDemo, entries["effect/demo.html"]);
  await standalone.context().setOffline(true);
  await standalone.goto(pathToFileURL(localDemo).href);
  const localCanvas = standalone.locator("canvas[data-dither-effect]");
  await expect(localCanvas).toBeVisible();
  await expect(standalone.locator("#error")).toHaveText("");
  await standalone.getByRole("button", { name: "Pause", exact: true }).click();
  const localPixels = () => localCanvas.evaluate(c => (c as HTMLCanvasElement).toDataURL());
  const pausedFrame = await localPixels();
  await standalone.waitForTimeout(100);
  expect(await localPixels()).toBe(pausedFrame);
  await standalone.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(localPixels).not.toBe(pausedFrame);
  await standalone.getByRole("button", { name: "Pause", exact: true }).click();
  const laterFrame = await localPixels();
  await standalone.getByRole("button", { name: "Restart", exact: true }).click();
  await expect.poll(localPixels).not.toBe(laterFrame);
  await standalone.context().setOffline(false);
  await standalone.goto(`http://127.0.0.1:${port}/demo.html`);
  await expect(standalone.locator("canvas[data-dither-effect]")).toBeVisible();
  await expect(standalone.locator("#error")).toHaveText("");
  await standalone.getByRole("button",{name:"Pause",exact:true}).click();
  await standalone.goto(`http://127.0.0.1:${port}/proof.html`);
  await expect(standalone.locator("canvas[data-dither-effect]")).toBeVisible();
  const pixels=()=>standalone.locator("canvas").evaluate(c=>Array.from((c as HTMLCanvasElement).getContext("2d")!.getImageData(0,0,(c as HTMLCanvasElement).width,(c as HTMLCanvasElement).height).data));
  await expect.poll(async()=>JSON.stringify(await pixels())===JSON.stringify(expected.pixels)).toBe(true);
  const initial=await pixels();
  await standalone.locator("canvas").hover({position:{x:settings.output.width/2+10,y:settings.output.height/2}});
  await expect.poll(async()=>JSON.stringify(await pixels())!==JSON.stringify(initial)).toBe(true);
  await standalone.mouse.move(settings.output.width+20,settings.output.height+20);
  await expect.poll(async()=>JSON.stringify(await pixels())===JSON.stringify(initial),{timeout:15000}).toBe(true);
  await standalone.evaluate(()=>{const e=(window as EffectWindow).effect;e.seek(0);});
  const zero=await pixels();
  await standalone.evaluate(()=>{const e=(window as EffectWindow).effect;e.seek(e.currentTime+1);});
  expect(await pixels()).not.toEqual(zero);
  await standalone.evaluate((duration)=>{(window as EffectWindow).effect.seek(duration);},settings.playback.durationSeconds);
  expect(await pixels()).toEqual(zero);
  await standalone.evaluate(()=>{(window as EffectWindow).effect.play();});
  await expect.poll(()=>standalone.evaluate(()=>(window as EffectWindow).effect.currentTime)).toBeGreaterThan(0);
  await standalone.evaluate(()=>{(window as EffectWindow).effect.pause();});
  const paused=await standalone.evaluate(()=>(window as EffectWindow).effect.currentTime);
  await standalone.waitForTimeout(100);
  expect(await standalone.evaluate(()=>(window as EffectWindow).effect.currentTime)).toBe(paused);
  await standalone.evaluate(()=>{document.querySelector<HTMLElement>("#host")!.style.width="480px";(window as EffectWindow).effect.resize();});
  await expect(standalone.locator("canvas")).toHaveAttribute("width",String(480*settings.renderScale));
  await standalone.emulateMedia({reducedMotion:"reduce"});
  await standalone.locator("canvas").hover();
  await standalone.waitForTimeout(100);
  expect(errors).toEqual([]);
  await standalone.evaluate(()=>{(window as EffectWindow).effect.destroy();(window as EffectWindow).effect.destroy();});
  await expect(standalone.locator("canvas")).toHaveCount(0);
 } finally {await standalone.close();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
 // Apply the companion file to another source using the existing studio importer.
 const replacementImage = Buffer.from(await page.evaluate(() => {
   const c=document.createElement("canvas");c.width=96;c.height=64;
   const ctx=c.getContext("2d")!;ctx.fillStyle="#222222";ctx.fillRect(0,0,96,64);
   ctx.fillStyle="#eeeeee";ctx.fillRect(0,0,48,64);
   return c.toDataURL("image/png").split(",")[1];
 }), "base64");
 const sourceControl = await getToolcraftControlFieldByTarget(page,"source.image");
 await sourceControl.locator('input[type="file"]').setInputFiles({buffer:replacementImage,mimeType:"image/png",name:"another-image.png"});
 await expect(page.locator(ditherOutput)).toBeVisible();
 await setDitherSwitch(page,"dither.invert",true);
 const chooser = page.waitForEvent("filechooser");
 await page.getByRole("button",{name:"Import Settings",exact:true}).click();
 await (await chooser).setFiles({buffer:Buffer.from(entries["effect/import-style.json"]),mimeType:"application/json",name:"import-style.json"});
 const invertControl = await getToolcraftControlFieldByTarget(page,"dither.invert");
 await expect(invertControl.getByRole("switch")).toHaveAttribute("aria-checked","false");
 const secondDownload = page.waitForEvent("download");
 await page.getByRole("button",{name:"Export Config",exact:true}).click();
 const secondEntries=unzipSync(await fs.readFile((await (await secondDownload).path())!));
 expect(Buffer.from(secondEntries["effect/image.png"])).toEqual(replacementImage);
 const originalStyle=JSON.parse(strFromU8(entries["effect/import-style.json"]));
 const restoredStyle=JSON.parse(strFromU8(secondEntries["effect/import-style.json"]));
 expect(restoredStyle.values).toEqual(originalStyle.values);
 expect(restoredStyle.canvas).toEqual(originalStyle.canvas);
 expect(restoredStyle.timeline).toEqual(originalStyle.timeline);

});
