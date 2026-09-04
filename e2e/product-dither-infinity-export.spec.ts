import { expect, test } from "./toolcraft-product-test";
import { expectToolcraftInfinityCanvasImageExportEvidence, expectToolcraftInfinityCanvasVideoExportEvidence, observeInfinityCanvas } from "./browser-infinity-canvas-evidence";
import { chooseDitherExport, downloadDither, prepareDitherExport, setDitherDuration } from "./product-dither-export-helpers";
import { setDitherSwitch } from "./product-dither-helpers";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { inspectToolcraftVideoDownload, assertToolcraftVideoPacketSchedule } from "./video-artifact-inspection";
import { outwardRoundToolcraftSceneRect } from "../src/toolcraft/runtime";
import { createToolcraftVideoFrameSchedule } from "../src/toolcraft/runtime/export/video-frame-schedule";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import type { Page } from "@playwright/test";

async function cropFiniteArtboard(page: Page) {
  const field = await getToolcraftControlFieldByTarget(page, "canvas.size.height");
  await field.locator("input").first().fill("160");
  await field.locator("input").first().press("Enter");
}

test("browser: Infinity PNG uses dither scene bounds", async ({ page }) => {
  await prepareDitherExport(page);
  await cropFiniteArtboard(page);
  await chooseDitherExport(page, "export.image.format", "PNG");
  await chooseDitherExport(page, "export.image.resolution", "2K");
  const finite = await inspectToolcraftImageDownload({ page, download: await downloadDither(page, "Export PNG"), backgroundRgba: [10,10,10,255] });
  const observed = await observeInfinityCanvas(page);
  const bounds = outwardRoundToolcraftSceneRect(observed.productScene.worldRect!);
  await setDitherSwitch(page, "canvas.infinity", true);
  const infinite = await inspectToolcraftImageDownload({ page, download: await downloadDither(page, "Export PNG"), backgroundRgba: [10,10,10,255] });
  for (const artifact of [finite, infinite]) {
    expect(artifact.observation.occupiedAreaRatio).toBeGreaterThan(.05);
    expect(artifact.observation.normalizedPixels.some((v,i) => i % 4 !== 3 && v > 80)).toBe(true);
  }
  expect(infinite.inspection.decodedPixelHash).not.toBe(finite.inspection.decodedPixelHash);
  const ratio = 2048 / Math.max(bounds.width, bounds.height);
  await expectToolcraftInfinityCanvasImageExportEvidence({ finite: finite.inspection, infinite: infinite.inspection }, { expectedFiniteSize: { width: 2048, height: 1024 }, expectedInfiniteSize: { width: Math.round(bounds.width * ratio), height: Math.round(bounds.height * ratio) }, requirementId: "canvas.infinity-image-export", target: "canvas.infinity" });
});

test("browser: Infinity MP4 uses one stable scene envelope", async ({ page }) => {
  await prepareDitherExport(page);
  await cropFiniteArtboard(page);
  await setDitherDuration(page, 1);
  await chooseDitherExport(page, "export.video.format", "MP4");
  await chooseDitherExport(page, "export.video.resolution", "Current");
  const schedule = createToolcraftVideoFrameSchedule(1);
  const finite = await inspectToolcraftVideoDownload({ page, download: await downloadDither(page, "Export Video"), schedule, backgroundRgba: [10,10,10,255] });
  const before = await observeInfinityCanvas(page);
  const bounds = outwardRoundToolcraftSceneRect(before.productScene.worldRect!);
  await setDitherSwitch(page, "canvas.infinity", true);
  const infinite = await inspectToolcraftVideoDownload({ page, download: await downloadDither(page, "Export Video"), schedule, backgroundRgba: [10,10,10,255] });
  for (const artifact of [finite, infinite]) {
    expect(artifact.inspection.frameCount).toBe(30);
    assertToolcraftVideoPacketSchedule({ packetTimings: artifact.inspection.packetTimings, schedule, timeResolution: artifact.timeResolution });
    expect(new Set(artifact.inspection.samplePixelHashes).size).toBeGreaterThan(1);
  }
  expect((await observeInfinityCanvas(page)).productScene.worldRect).toEqual(before.productScene.worldRect);
  await expectToolcraftInfinityCanvasVideoExportEvidence({ finite: finite.inspection, infinite: infinite.inspection }, { expectedFiniteSize: { width: 320, height: 160 }, expectedInfiniteSize: { width: Math.round(bounds.width / 2) * 2, height: Math.round(bounds.height / 2) * 2 }, requirementId: "canvas.infinity-video-export", target: "canvas.infinity" });
});
