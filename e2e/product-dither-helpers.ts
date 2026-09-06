import { expect, type Page } from "@playwright/test";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { createToolcraftBrowserProofSession } from "./browser-proof-session";

export const ditherOutput = "canvas[data-dither-output]";

export async function setDitherSwitch(page: Page, target: string, checked: boolean) {
  const control = await getToolcraftControlFieldByTarget(page, target);
  const toggle = control.getByRole("switch");
  if ((await toggle.getAttribute("aria-checked")) !== String(checked)) await toggle.click();
}

export async function prepareDither(page: Page) {
  await page.goto("/");
  const session = await createToolcraftBrowserProofSession(page);
  const pause = page.getByRole("button", { name: "Pause playback", exact: true });
  if (await pause.count()) await pause.click();
  for (const [target, value] of [["canvas.size.width", "320"], ["canvas.size.height", "180"]]) {
    const field = await getToolcraftControlFieldByTarget(page, target);
    const input = field.locator("input").first();
    await input.fill(value);
    await input.press("Enter");
  }
  await setDitherSwitch(page, "pointer.enabled", false);
  await uploadDitherSource(page);
  return session;
}

export async function uploadDitherSource(page: Page) {
  const bytes = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 96; canvas.height = 64;
    const context = canvas.getContext("2d")!;
    const data = context.createImageData(96, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 96; x++) {
      const value = Math.round((x / 95) * 180 + ((x + y) % 7) * 10);
      const i = (y * 96 + x) * 4;
      data.data.set([value, value, value, 255], i);
    }
    context.putImageData(data, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const source = await getToolcraftControlFieldByTarget(page, "source.image");
  await source.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(bytes, "base64"), mimeType: "image/png", name: "dither-gradient.png",
  });
  await expect(page.locator(ditherOutput)).toBeVisible();
  await expect.poll(() => page.locator(ditherOutput).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const bytes = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    return bytes.some((value, index) => index % 4 !== 3 && value > 40);
  })).toBe(true);
}

/** Keep the pointer held until the caller has proved live output. */
export async function startDitherSliderDrag(page: Page, target: string, ratio: number) {
  const field = await getToolcraftControlFieldByTarget(page, target);
  await field.scrollIntoViewIfNeeded();
  const slider = field.locator('[data-slot="slider"]').first();
  const thumb = field.getByRole("slider").first();
  const before = await thumb.getAttribute("aria-valuenow");
  const box = await slider.boundingBox();
  const knob = await thumb.boundingBox();
  if (!box || !knob) throw new Error(`Missing slider geometry: ${target}`);
  await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ratio, box.y + box.height / 2, { steps: 8 });
  await expect(thumb).not.toHaveAttribute("aria-valuenow", before!);
}

export async function seekDitherPhase(page: Page, phase = 0.22) {
  await setDitherSwitch(page, "panels.timeline.extended", true);
  const scrubber = page.getByRole("slider", { name: "Playback position" });
  const bounds = await scrubber.boundingBox();
  if (!bounds) throw new Error("Missing timeline scrubber");
  await scrubber.click({ position: { x: bounds.width * phase, y: bounds.height / 2 } });
  await expect(scrubber).not.toHaveAttribute("aria-valuenow", "0");
}
