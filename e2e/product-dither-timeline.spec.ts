import type { Page } from "@playwright/test";
import { expect, test } from "./toolcraft-product-test";
import { readToolcraftBrowserObservation } from "./browser-proof-session";
import { expectToolcraftTimelineDuration, expectToolcraftTimelineLoop, expectToolcraftTimelinePauseResume, expectToolcraftTimelineRenderedFrame, expectToolcraftTimelineScrub } from "./browser-timeline-evidence-helpers";
import { prepareDither, setDitherSwitch } from "./product-dither-helpers";

async function setDuration(page: Page, seconds: number) {
  await page.getByRole("button", { name: "Edit timeline duration" }).click();
  const input = page.getByRole("textbox", { name: "timeline duration" });
  await input.fill(`${seconds}s`); await input.press("Enter");
}
async function waitForWrap(page: Page) {
  await page.evaluate(async () => {
    const slider = document.querySelector('[aria-label="Playback position"]')!;
    let previous = Number(slider.getAttribute('aria-valuenow')) / Number(slider.getAttribute('aria-valuemax'));
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      const phase = Number(slider.getAttribute('aria-valuenow')) / Number(slider.getAttribute('aria-valuemax'));
      if (previous > .75 && phase < .25) return;
      previous = phase;
    }
  });
}

test("browser: dither timeline is seamless and forward-only", async ({ page }) => {
  const session = await prepareDither(page);
  await setDitherSwitch(page, "panels.timeline.extended", true);
  const slider = page.getByRole("slider", { name: "Playback position" });
  await slider.press("Home");
  const observeFrame = session.observe((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>('canvas[data-dither-output]')!;
    const bytes = canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
    let hash = 2166136261; for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
    const slider = root.querySelector('[aria-label="Playback position"]')!;
    return { currentTimeSeconds: Number(slider.getAttribute('aria-valuenow')), outputSignature: String(hash >>> 0) };
  });
  await slider.press("End"); await slider.press("ArrowLeft");
  await page.waitForTimeout(100);
  const scrubbed = await readToolcraftBrowserObservation(observeFrame);
  await slider.press("Home"); await page.waitForTimeout(100);
  await expectToolcraftTimelineScrub(observeFrame, session.action(async () => { await slider.press("End"); await slider.press("ArrowLeft"); }), scrubbed, { requirementId: "timeline.playback" });
  await slider.press("Home"); await page.waitForTimeout(100);
  await expectToolcraftTimelineRenderedFrame(observeFrame, session.action(async () => { await slider.press("End"); await slider.press("ArrowLeft"); }), scrubbed, { requirementId: "timeline.playback" });
  await slider.press("Home"); await page.waitForTimeout(150);

  // This observation records real pixels and real transport samples while the
  // Playwright actions below operate the UI. It never supplies authored phases.
  const loopProof = expectToolcraftTimelineLoop(session.observe(async (root) => {
    const slider = root.querySelector('[aria-label="Playback position"]')!;
    const canvas = root.querySelector<HTMLCanvasElement>('canvas[data-dither-output]')!;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const time = () => Number(slider.getAttribute('aria-valuenow'));
    const duration = () => Number(slider.getAttribute('aria-valuemax'));
    const playing = () => Boolean(root.querySelector('[aria-label="Pause playback"]'));
    const wait = async (condition: () => boolean) => { while (!condition()) await delay(20); };
    const signature = () => {
      const bytes = canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
      let hash = 2166136261; for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
      return String(hash >>> 0);
    };
    const collect = async () => {
      await wait(() => time() === 0 && !playing()); await delay(100);
      const seamStartSignature = signature(); const durationSeconds = duration();
      await wait(() => time() === durationSeconds && !playing()); await delay(100);
      const seamEndSignature = signature();
      await wait(playing);
      const normalizedPhases: number[] = [];
      const renderedSignatures = new Set<string>();
      while (true) {
        const phase = time() / durationSeconds;
        const previous = normalizedPhases.at(-1);
        if (phase !== previous && phase < 1) normalizedPhases.push(phase);
        renderedSignatures.add(signature());
        if (previous !== undefined && previous > .75 && phase < .25) break;
        await delay(30);
      }
      if (renderedSignatures.size < 3) throw new Error("Timeline advanced without distinct rendered product frames.");
      return { durationSeconds, normalizedPhases, seamStartSignature, seamEndSignature };
    };
    const initial = await collect();
    await wait(() => duration() !== initial.durationSeconds);
    const resized = await collect();
    return { initial, resized };
  }), { requirementId: "timeline.playback" });
  await page.waitForTimeout(200);
  await slider.press("End"); await page.waitForTimeout(200);
  await slider.press("ArrowLeft"); await slider.press("ArrowLeft");
  await page.getByRole("button", { name: "Play playback", exact: true }).click();
  await waitForWrap(page); await page.waitForTimeout(120);
  await page.getByRole("button", { name: "Pause playback", exact: true }).click();
  await expectToolcraftTimelineDuration(session.observe((root) => ({
    renderedCycleDurationSeconds: Number(root.querySelector<HTMLCanvasElement>('canvas[data-dither-output]')?.dataset.ditherCycleDuration),
    timelineDurationSeconds: Number(root.querySelector('[aria-label="Playback position"]')?.getAttribute('aria-valuemax')),
  })), session.action(async () => { await setDuration(page, 2); await slider.press("Home"); }), 2, { requirementId: "timeline.playback" });
  await page.waitForTimeout(200);
  await slider.press("End"); await page.waitForTimeout(200);
  await slider.press("ArrowLeft"); await slider.press("ArrowLeft");
  await page.getByRole("button", { name: "Play playback", exact: true }).click();
  await waitForWrap(page); await page.waitForTimeout(120);
  await loopProof;

  await expectToolcraftTimelinePauseResume(session.observe((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>('canvas[data-dither-output]')!;
    const bytes = canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
    let hash = 2166136261; for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
    return { currentTimeSeconds: Number(root.querySelector('[aria-label="Playback position"]')?.getAttribute('aria-valuenow')), outputSignature: String(hash >>> 0), playing: Boolean(root.querySelector('[aria-label="Pause playback"]')) };
  }), session.action(async () => { await page.getByRole("button", { name: "Pause playback", exact: true }).click(); await page.waitForTimeout(100); }), session.action(async () => { await page.getByRole("button", { name: "Play playback", exact: true }).click(); }), { requirementId: "timeline.playback" });
  await page.getByRole("button", { name: "Pause playback", exact: true }).click();
  expect(await slider.getAttribute('aria-valuemax')).toBe('2');
});
