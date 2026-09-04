import type { Page } from "@playwright/test";
import { expect, test } from "./toolcraft-product-test";
import { ditherOutput, prepareDither, startDitherSliderDrag } from "./product-dither-helpers";
import { getToolcraftProductObservableSnapshot } from "./product-observable-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";

async function downloadSettings(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Settings", exact: true }).click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  return { buffer, payload: JSON.parse(buffer.toString("utf8")), name: download.suggestedFilename() };
}

async function importSettings(page: Page, buffer: Buffer) {
  const pending = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import Settings", exact: true }).click();
  await (await pending).setFiles({ buffer, mimeType: "application/json", name: "scene.json" });
}

const pixels = (page: Page) => getToolcraftProductObservableSnapshot(page, { selector: ditherOutput });

test("browser: settings JSON round-trip restores the same dither pixels", async ({ page }) => {
  await prepareDither(page);
  await startDitherSliderDrag(page, "tone.gamma", 0.28);
  await page.mouse.up();
  const saved = await downloadSettings(page);
  expect(saved.name).toMatch(/\.json$/);
  expect(saved.payload.version).toBe(2);
  expect(saved.payload.source).toBe("toolcraft-settings");
  expect(saved.payload.values).not.toHaveProperty("source.image");
  expect(saved.buffer.toString()).not.toContain("data:image/");
  const before = await pixels(page);
  const invert = await getToolcraftControlFieldByTarget(page, "dither.invert");
  await invert.getByRole("switch").click();
  await expect.poll(() => pixels(page)).not.toBe(before);
  await importSettings(page, saved.buffer);
  await expect.poll(() => pixels(page)).toBe(before);
  const restored = await downloadSettings(page);
  expect(restored.payload.values).toEqual(saved.payload.values);
  expect(restored.payload.canvas).toEqual(saved.payload.canvas);
  expect(restored.payload.timeline).toEqual(saved.payload.timeline);
});

test("browser: invalid settings JSON preserves the current image and values", async ({ page }) => {
  await prepareDither(page);
  const saved = await downloadSettings(page);
  const before = await pixels(page);
  const dialog = page.waitForEvent("dialog");
  await importSettings(page, Buffer.from('{"version":999,"values":{}}'));
  const error = await dialog;
  expect(error.message()).toContain("Could not import settings JSON");
  await error.accept();
  expect(await pixels(page)).toBe(before);
  expect((await downloadSettings(page)).payload.values).toEqual(saved.payload.values);
});

test("browser: undo redo and section reset restore dither output", async ({ page }) => {
  await prepareDither(page);
  const before = await pixels(page);
  await startDitherSliderDrag(page, "tone.gamma", 0.1);
  await page.mouse.up();
  await expect.poll(() => pixels(page)).not.toBe(before);
  const changed = await pixels(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => pixels(page)).toBe(before);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect.poll(() => pixels(page)).toBe(changed);
  await page.getByRole("button", { name: "Reset Tone section", exact: true }).click();
  await expect.poll(() => pixels(page)).toBe(before);
});
