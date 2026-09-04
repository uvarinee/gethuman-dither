import { expect, test } from "./toolcraft-product-test";
import { prepareDither, setDitherSwitch, seekDitherPhase } from "./product-dither-helpers";
import { chooseDitherExport, downloadDither, setDitherDuration } from "./product-dither-export-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { inspectToolcraftVideoDownload, assertToolcraftVideoPacketSchedule } from "./video-artifact-inspection";
import { createToolcraftVideoFrameSchedule } from "../src/toolcraft/runtime/export/video-frame-schedule";

test("browser: independent flicker reaches colored PNG and animated MP4", async ({ page }) => {
  await prepareDither(page);
  await setDitherSwitch(page, "motion.flicker.enabled", true);
  await setDitherSwitch(page, "motion.breathing.enabled", false);
  await page.getByRole("button", { name: "Remove Pin", exact: true }).click();
  const color = (await getToolcraftControlFieldByTarget(page, "dither.ink")).getByRole("textbox");
  await color.fill("#00FF88"); await color.press("Enter");
  await seekDitherPhase(page);
  await chooseDitherExport(page, "export.image.resolution", "2K");
  const png = await inspectToolcraftImageDownload({ page, download: await downloadDither(page, "Export PNG"), backgroundRgba: [10, 10, 10, 255] });
  const pixels = png.observation.normalizedPixels;
  expect(pixels.some((value, i) => i % 4 === 1 && value > 120 && pixels[i - 1] < 20)).toBe(true);
  await setDitherDuration(page, 1);
  const schedule = createToolcraftVideoFrameSchedule(1);
  const mp4 = await inspectToolcraftVideoDownload({ page, download: await downloadDither(page, "Export Video"), schedule, backgroundRgba: [10, 10, 10, 255] });
  expect(mp4.inspection.frameCount).toBe(30);
  assertToolcraftVideoPacketSchedule({ packetTimings: mp4.inspection.packetTimings, schedule, timeResolution: mp4.timeResolution });
  expect(new Set(mp4.inspection.samplePixelHashes).size).toBeGreaterThan(1);
  await page.screenshot({ path: ".toolcraft/browser-artifacts/flicker-refinement.png" });
});
