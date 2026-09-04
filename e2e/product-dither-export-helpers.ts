import { expect, type Page } from "@playwright/test";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { prepareDither, setDitherSwitch } from "./product-dither-helpers";
import { expectExportExcludesCanvasHandles } from "./canvas-handle-helpers";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { observeToolcraftDecodedPixels, type ToolcraftExpectedDecodedPixel } from "./decoded-pixel-observation";

export async function readDitherPreviewExpectation(page: Page, video = false) {
  const pixels = await page.locator("canvas[data-dither-output]").evaluate((element, smooth) => {
    const sample = document.createElement("canvas"); sample.width = 64; sample.height = 64;
    const context = sample.getContext("2d")!; context.imageSmoothingEnabled = smooth;
    const canvas = element as HTMLCanvasElement;
    const css = getComputedStyle(canvas);
    const scaleX = canvas.width / Number.parseFloat(css.width);
    const scaleY = canvas.height / Number.parseFloat(css.height);
    // Finite artifact is the centered320×180 artboard clip, not the full source world frame.
    const cropWidth = 320 * scaleX, cropHeight = 180 * scaleY;
    context.drawImage(canvas, (canvas.width - cropWidth) / 2, (canvas.height - cropHeight) / 2, cropWidth, cropHeight, 0, 0, 64, 64);
    return Array.from(context.getImageData(0, 0, 64, 64).data);
  }, video);
  const observation = await observeToolcraftDecodedPixels({ backgroundRgba: [10, 10, 10, 255], pixels: Uint8ClampedArray.from(pixels), sourceWidth: 64, sourceHeight: 64 });
  const expectedPixels: ToolcraftExpectedDecodedPixel[] = [];
  // Pick stable, fully painted ink interiors outside the central animated pin.
  for (let y = 4; y < 60 && expectedPixels.length < 3; y++) for (let x = 48; x < 60 && expectedPixels.length < 3; x++) {
    const i = (y * 64 + x) * 4;
    if (video) {
      const sceneX = (x + 0.5) * 320 / 64, sceneY = (y + 0.5) * 180 / 64;
      const cellWidth = 320 / Math.ceil(320 / 16), cellHeight = 180 / Math.ceil(180 / 16);
      if (Math.abs((sceneX % cellWidth) - cellWidth / 2) > cellWidth * 0.15 || Math.abs((sceneY % cellHeight) - cellHeight / 2) > cellHeight * 0.15) continue;
    }
    if (video && [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => {
      const offset = ((y + dy) * 64 + x + dx) * 4;
      return pixels[offset] !== 244 || pixels[offset + 1] !== 241 || pixels[offset + 2] !== 234;
    }))) continue;
    if (pixels[i] === 244 && pixels[i + 1] === 241 && pixels[i + 2] === 234 && pixels[i + 3] === 255)
      expectedPixels.push({ xRatio: (x + 0.5) / 64, yRatio: (y + 0.5) / 64, rgba: [pixels[i], pixels[i + 1], pixels[i + 2], 255] });
  }
  expect(expectedPixels.length).toBeGreaterThan(0);
  expect(observation.nonBackgroundBounds).not.toBeNull();
  return { expectedPixels, expectedBounds: observation.nonBackgroundBounds! };
}

export async function provePinExportClean(page: Page) {
  await chooseDitherExport(page, "export.image.format", "PNG");
  await chooseDitherExport(page, "export.image.resolution", "2K");
  await expectExportExcludesCanvasHandles(page,
    () => downloadDither(page, "Export PNG"),
    async (download) => (await inspectToolcraftImageDownload({ page, download, backgroundRgba: [10, 10, 10, 255] })).inspection,
    { requirementId: "pins.drag", target: "pins.items" });
}

export async function chooseDitherExport(page: Page, target: string, label: string) {
  const field = await getToolcraftControlFieldByTarget(page, target);
  await field.getByRole("combobox").click();
  await page.locator('[role="option"]').filter({ hasText: label }).click({ timeout: 5000 });
}

export async function downloadDither(page: Page, label: "Export PNG" | "Export Video") {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: label, exact: true }).click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  return download;
}

export async function downloadDitherWithProgress(page: Page, label: "Export PNG" | "Export Video") {
  const footer = page.locator('[data-slot="toolcraft-panel-sticky-actions"]');
  const lifecycle = footer.evaluate((element) => new Promise<{ progress: number[]; visible: boolean; hidden: boolean }>((resolve) => {
    const progress: number[] = [];
    let started = false, visible = false;
    const sample = () => {
      const active = element.getAttribute("data-sticky-footer-active") === "true";
      const value = element.getAttribute("data-sticky-footer-progress");
      if (active) {
        started = true;
        if (value !== null) progress.push(Number(value));
        const style = getComputedStyle(element, "::before");
        visible ||= Number(style.opacity) > 0 && Number.parseFloat(style.height) > 0 && element.getBoundingClientRect().width > 0;
      }
      if (started && !active && getComputedStyle(element, "::before").opacity === "0") {
        observer.disconnect();
        resolve({ progress, visible, hidden: true });
        return true;
      }
      return false;
    };
    const observer = new MutationObserver(() => { sample(); });
    observer.observe(element, { attributes: true });
    const frame = () => { if (!sample()) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  }));
  const download = await downloadDither(page, label);
  const observed = await lifecycle;
  expect(observed.visible, "Sticky export accent is actually visible while work is active").toBe(true);
  expect(observed.progress.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
  expect(Math.max(...observed.progress), "Progress advances through real rendering/encoding").toBeGreaterThan(Math.min(...observed.progress));
  expect(observed.hidden, "Sticky accent disappears after export settles").toBe(true);
  await expect(footer).not.toHaveAttribute("data-sticky-footer-active", "true");
  return download;
}

export async function prepareDitherExport(page: Page) {
  const session = await prepareDither(page);
  await setDitherSwitch(page, "motion.flicker.enabled", false);
  await setDitherSwitch(page, "motion.breathing.enabled", false);
  return session;
}

export async function setDitherDuration(page: Page, seconds: number) {
  await setDitherSwitch(page, "panels.timeline.extended", true);
  await page.getByRole("button", { name: "Edit timeline duration" }).click();
  const input = page.getByRole("textbox", { name: "timeline duration" });
  await input.fill(`${seconds}s`);
  await input.press("Enter");
}
