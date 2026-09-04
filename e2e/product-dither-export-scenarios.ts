import { expect } from "./toolcraft-product-test";
import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { inspectToolcraftVideoDownload, assertToolcraftVideoPacketSchedule } from "./video-artifact-inspection";
import { createToolcraftVideoFrameSchedule } from "../src/toolcraft/runtime/export/video-frame-schedule";
import { chooseDitherExport, downloadDither, downloadDitherWithProgress, prepareDitherExport, setDitherDuration, readDitherPreviewExpectation } from "./product-dither-export-helpers";
import { expectToolcraftImageExportArtifact, expectToolcraftVideoExportArtifact } from "./browser-media-export-evidence";
import { setDitherSwitch } from "./product-dither-helpers";
import type { Download, Page } from "@playwright/test";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";

export async function proveDitherImageArtifacts(page: Page, domain: "export" | "image.format" | "image.resolution") {
  const requirementId = domain === "export" ? "export.image" : domain;
  const target = domain === "export" ? "actions.output" : `export.${domain}`;
  const session = await prepareDitherExport(page);
  const inspections = [];
  for (const [format, resolution, width, height] of [["PNG", "2K", 2048, 1152], ["JPG", "4K", 4096, 2304]] as const) {
    await chooseDitherExport(page, "export.image.format", format);
    await chooseDitherExport(page, "export.image.resolution", resolution);
    const inspect = async (download: Download) => {
        const result = await inspectToolcraftImageDownload({ page, download, backgroundRgba: [10, 10, 10, 255] });
        expect(result.inspection.mediaType).toBe(format === "PNG" ? "image/png" : "image/jpeg");
        expect(result.inspection.width).toBe(width);
        expect(result.inspection.height).toBe(height);
        expect(result.observation.occupiedAreaRatio).toBeGreaterThan(0.05);
        expect(result.observation.normalizedPixels.some((value, index) => index % 4 !== 3 && value > 80)).toBe(true);
        inspections.push(result.inspection);
        return result.inspection;
      };
    if (format === "JPG") await expectToolcraftExportedArtifact(session.targetAction(target, async () => downloadDither(page, "Export PNG")), inspect, { requirementId });
    else await inspect(await downloadDither(page, "Export PNG"));
  }
  expect(inspections[0].decodedPixelHash).not.toBe(inspections[1].decodedPixelHash);
  await chooseDitherExport(page, "export.image.format", "PNG");
  await chooseDitherExport(page, "export.image.resolution", "2K");
  const preview = await readDitherPreviewExpectation(page);
  await chooseDitherExport(page, "export.image.resolution", "8K");
  await expectToolcraftImageExportArtifact(session.targetAction(target, async () => downloadDitherWithProgress(page, "Export PNG")), {
    page, requirementId, backgroundRgba: [10, 10, 10, 255],
    expectedWidth: 8192, expectedHeight: 4608, expectedMediaType: "image/png", ...preview,
    additionalArtifactRequirements: domain === "export" ? [] : [{ requirementId, target }],
  });
  await chooseDitherExport(page, "export.image.resolution", "2K");
  await setDitherSwitch(page, "export.includeBackground", false);
  const transparent = await inspectToolcraftImageDownload({ page, download: await downloadDither(page, "Export PNG"), backgroundRgba: [0, 0, 0, 0] });
  expect(transparent.observation.normalizedPixels.some((value, index) => index % 4 === 3 && value === 0)).toBe(true);
  expect(transparent.observation.normalizedPixels.some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
}

export async function proveDitherVideoArtifacts(page: Page, domain: "export" | "video.format" | "video.resolution") {
  const requirementId = domain === "export" ? "export.video" : domain;
  const target = domain === "export" ? "actions.output" : `export.${domain}`;
  const session = await prepareDitherExport(page);
  // Broad cells have stable interiors across lossy encoding and64px decoded observations.
  const pixelSize = await getToolcraftControlFieldByTarget(page, "dither.pixelSize");
  await expectToolcraftProductObservableToChange(session,
    session.controlAction("dither.pixelSize", async (control) => control.getByRole("slider").press("End")),
    { selector: "canvas[data-dither-output]" });
  await expect(pixelSize.getByRole("slider")).toHaveAttribute("aria-valuenow", "16");
  await setDitherDuration(page, 1);
  const schedule = createToolcraftVideoFrameSchedule(1);
  const preview = await readDitherPreviewExpectation(page, true);
  const samples = [schedule[0], schedule[Math.floor(schedule.length / 2)], schedule[schedule.length - 1]]
    .map(({ timeSeconds }) => ({ timeSeconds, pixels: preview.expectedPixels }));
  for (const [format, resolution, width, height] of [["MP4", "Current", 320, 180], ["WebM", "4K", 3840, 2160]] as const) {
    await chooseDitherExport(page, "export.video.format", format);
    await chooseDitherExport(page, "export.video.resolution", resolution);
    const inspect = async (download: Download) => {
      const result = await inspectToolcraftVideoDownload({ page, download, schedule, backgroundRgba: [10, 10, 10, 255] });
      expect(result.inspection.mediaType).toBe(format === "MP4" ? "video/mp4" : "video/webm");
      expect(result.inspection.width).toBe(width);
      expect(result.inspection.height).toBe(height);
      expect(result.inspection.frameCount).toBe(schedule.length);
      expect(Math.abs(result.inspection.durationMs - 1000)).toBeLessThanOrEqual(1000 / result.timeResolution);
      assertToolcraftVideoPacketSchedule({ packetTimings: result.inspection.packetTimings, schedule, timeResolution: result.timeResolution });
      expect(new Set(result.inspection.samplePixelHashes).size).toBeGreaterThan(1);
      return result.inspection;
    };
    if (format === "WebM") await expectToolcraftExportedArtifact(session.targetAction(target, async () => downloadDither(page, "Export Video")), inspect, { requirementId });
    else await inspect(await downloadDither(page, "Export Video"));
  }
  await expectToolcraftVideoExportArtifact(session.targetAction(target, async () => downloadDitherWithProgress(page, "Export Video")), {
    page, requirementId, backgroundRgba: [10, 10, 10, 255], animated: true,
    expectedDurationSeconds: 1, expectedWidth: 3840, expectedHeight: 2160,
    expectedMediaType: "video/webm", expectedSamples: samples, schedule,
    additionalArtifactRequirements: domain === "export" ? [] : [{ requirementId, target }],
  });
}
