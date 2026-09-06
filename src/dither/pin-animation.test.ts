import { expect, it } from "vitest";
import { samplePin, type DitherPin } from "./pin-animation";
import { getDynamicCell } from "./dither-renderer";
import { readDynamicSettings, parsePins } from "./dither-scene";
const pin: DitherPin = { position: { x: 64, y: 64 }, color: "#FF4F2E", radius: 40, coverage: 0.55, noise: 0.85, speed: 1, softness: 0.25, scatter: 0.2 };
const points = Array.from({ length: 100 }, (_, i) => [30 + (i % 10) * 7, 30 + Math.floor(i / 10) * 7]);
it("Pins changes dither output", () => {
  const settings = readDynamicSettings({}, 128, 128, 0.16, false);
  expect(points.map(([x,y]) => getDynamicCell(x,y,{...settings,pins:[pin]}))).not.toEqual(points.map(([x,y]) => getDynamicCell(x,y,settings)));
  expect(getDynamicCell(105,64,{...settings,pins:[pin]})).toEqual(getDynamicCell(105,64,settings));
});
it("noise varies independently across cells and time without a shared on/off pulse", () => {
  const samples = Array.from({length:50}, (_,i) => points.map(([x,y]) => samplePin(x,y,i/50,pin).weight));
  for(const frame of samples) {
    expect(frame.some(w=>w>0.7)).toBe(true);
    expect(frame.some(w=>w<0.1)).toBe(true);
    expect(new Set(frame).size).toBeGreaterThan(10);
  }
  expect(samples[0]).not.toEqual(samples[1]);
});
it("every noise control affects its promised output and zero speed freezes the field", () => {
  const signature = (p: DitherPin) => points.map(([x,y])=>samplePin(x,y,0.31,p));
  for(const patch of [{coverage:0.2},{noise:0},{speed:3},{softness:0.8},{scatter:1},{radius:20}]) expect(signature({...pin,...patch})).not.toEqual(signature(pin));
  for(const [x,y] of points) expect(samplePin(x,y,0,{...pin,speed:0})).toEqual(samplePin(x,y,0.8,{...pin,speed:0}));
});
it("scatter is optional, grows at the periphery, and never pushes the center out", () => {
  expect(samplePin(64,64,0.2,pin)).toMatchObject({offsetX:0,offsetY:0});
  for(const [x,y] of points) {
    const none=samplePin(x,y,0.2,{...pin,scatter:0});
    const low=samplePin(x,y,0.2,{...pin,scatter:0.2});
    const high=samplePin(x,y,0.2,{...pin,scatter:1});
    expect(none.offsetX).toBe(0); expect(none.offsetY).toBe(0);
    expect(none.weight).toBe(low.weight);
    expect(high.offsetX).toBeCloseTo(low.offsetX*5); expect(high.offsetY).toBeCloseTo(low.offsetY*5);
    if(Math.hypot(x-64,y-64)<10) expect(Math.hypot(high.offsetX,high.offsetY)).toBeLessThan(1);
  }
});
it("soft edge fades locally, preserves crisp cells and closes the deterministic loop", () => {
  const solid={...pin,noise:0,coverage:1,scatter:0};
  expect(samplePin(64,64,0,solid).weight).toBe(1);
  expect(samplePin(103,64,0,solid).weight).toBeLessThan(0.1);
  expect(samplePin(104,64,0,solid).weight).toBe(0);
  expect(samplePin(103,64,0,{...solid,softness:0}).weight).toBe(1);
  for(const [x,y] of points) {
    expect(samplePin(x,y,0,pin)).toEqual(samplePin(x,y,1,pin));
    const end=samplePin(x,y,1-1e-8,pin),start=samplePin(x,y,0,pin);
    expect(end.weight).toBeCloseTo(start.weight,5); expect(end.offsetX).toBeCloseTo(start.offsetX,5);
    const scaled=samplePin(x*2,y*2,0.31,{...pin,radius:80,position:{x:128,y:128}}),original=samplePin(x,y,0.31,pin);
    expect(scaled.weight).toBe(original.weight); expect(scaled.offsetX).toBe(original.offsetX*2);
  }
});
it("old Pin records retain placement and color and receive the new noise defaults", () => {
  const restored=parsePins([{position:{x:"0.50",y:"-0.50"},radius:24,color:"#123456",flashes:8}],200,100,1)[0];
  expect(restored).toMatchObject({position:{x:150,y:25},radius:24,color:"#123456",coverage:0.55,noise:0.85,speed:1,softness:0.25,scatter:0.2});
});
