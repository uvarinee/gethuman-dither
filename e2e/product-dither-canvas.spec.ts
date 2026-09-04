import type { Page } from "@playwright/test";
import { expect, test } from "./toolcraft-product-test";
import { expectToolcraftInfinityCanvasModeEvidence, observeInfinityCanvas } from "./browser-infinity-canvas-evidence";
import { prepareDither, setDitherSwitch, ditherOutput } from "./product-dither-helpers";

async function retainNodes(page: Page) {
  const host = await page.locator('[data-toolcraft-product-scene]').elementHandle();
  const output = await page.locator(ditherOutput).elementHandle();
  if (!host || !output) throw new Error("Missing product scene");
  return async () => ({
    productHostPreserved: await host.evaluate((node) => node === document.querySelector('[data-toolcraft-product-scene]')),
    productOutputPreserved: await output.evaluate((node) => node === document.querySelector('canvas[data-dither-output]')),
  });
}

test("browser: Infinity mode preserves dither scene and backing", async ({ page }) => {
  await prepareDither(page);
  const before = await observeInfinityCanvas(page);
  const first = await retainNodes(page);
  await setDitherSwitch(page, "canvas.infinity", true);
  const enabled = await observeInfinityCanvas(page);
  const beforeToEnabled = await first();
  const canvas = page.locator('[data-slot="toolcraft-runtime-canvas"]');
  const box = await canvas.boundingBox(); if (!box) throw new Error("No canvas viewport");
  await setDitherSwitch(page, "panels.timeline.extended", true);
  await page.getByRole("button", { name: "Play playback", exact: true }).click();
  const pixels = () => page.locator(ditherOutput).evaluate((element) => {
    const output = element as HTMLCanvasElement;
    const bytes = output.getContext("2d")!.getImageData(0, 0, output.width, output.height).data;
    let hash = 2166136261;
    for (const value of bytes) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  });
  const playing = await pixels();
  await expect.poll(pixels).not.toBe(playing);
  await page.mouse.move(box.x + 35, box.y + 120);
  await page.mouse.down(); await page.mouse.move(box.x + 95, box.y + 155, { steps: 8 });
  await page.waitForTimeout(100);
  const held = await pixels();
  const transport = page.getByRole("slider", { name: "Playback position" });
  const timeHeld = await transport.getAttribute("aria-valuenow");
  await page.waitForTimeout(160);
  expect(await pixels()).toBe(held);
  await expect(transport).not.toHaveAttribute("aria-valuenow", timeHeld!);
  await expect(page.getByRole("button", { name: "Pause playback", exact: true })).toBeVisible();
  await page.mouse.up();
  await expect.poll(pixels).not.toBe(held);
  await page.getByRole("button", { name: "Pause playback", exact: true }).click();
  const afterPan = await observeInfinityCanvas(page);
  await expect(page.locator('[data-toolcraft-persistence-status]')).toHaveAttribute('data-toolcraft-persistence-status', 'success');
  await page.reload();
  await expect(page.locator(ditherOutput)).toBeVisible();
  await expect.poll(async () => (await observeInfinityCanvas(page)).productScene.backingWidth).toBe(before.productScene.backingWidth);
  const afterReload = await observeInfinityCanvas(page);
  const second = await retainNodes(page);
  await setDitherSwitch(page, "canvas.infinity", false);
  const restored = await observeInfinityCanvas(page);
  const afterReloadToRestored = await second();
  const third = await retainNodes(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const undone = await observeInfinityCanvas(page);
  const restoredToUndone = await third();
  const fourth = await retainNodes(page);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  const redone = await observeInfinityCanvas(page);
  await expectToolcraftInfinityCanvasModeEvidence({ before, enabled, afterPan, afterReload, restored, undone, redone }, { beforeToEnabled, afterReloadToRestored, restoredToUndone, undoneToRedone: await fourth() }, { expectedFiniteSize: { width: 320, height: 180 }, expectedSceneRect: before.productScene.worldRect!, requirementId: "canvas.infinity", target: "canvas.infinity" });
});
