import { appSchema } from "../src/app/app-schema";
import { expect, test } from "./toolcraft-product-test";
import { prepareDither, ditherOutput } from "./product-dither-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftPersistenceState } from "./browser-state-evidence-helpers";
import { getToolcraftProductObservableSnapshot } from "./product-observable-helpers";

const persistence = appSchema.persistence;
if (persistence.storage !== "localStorage") throw new Error("Dither workspace requires local persistence.");

test("browser: dither workspace restores canvas values panels timeline and media", async ({ page }) => {
  await page.addInitScript((key) => {
    Object.defineProperty(window, "__ditherPersistenceKey", { value: key });
  }, persistence.key);
  const session = await prepareDither(page);
  const runtime = page.locator('[data-slot="toolcraft-runtime-app"]');
  await expect(runtime).toHaveAttribute("data-toolcraft-persistence-status", "success");
  const originalResource = await page.evaluate((key) => {
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    return snapshot.state.mediaAssets[0].resourceRef as string;
  }, persistence.key);
  expect(originalResource).toBeTruthy();
  const observation = session.observe((root) => {
    const key = (window as Window & { __ditherPersistenceKey: string }).__ditherPersistenceKey;
    const state = JSON.parse(localStorage.getItem(key) ?? "{}").state ?? {};
    const source = state.mediaAssets?.[0];
    const canvas = root.querySelector<HTMLElement>("[data-toolcraft-editable-canvas]");
    const scrubber = root.querySelector('[role="slider"][aria-label="Playback position"]');
    return {
      persistedKeys: Object.keys(state).sort(),
      width: state.canvas?.size.width ?? null,
      liveWidth: canvas?.style.width ?? null,
      inverted: state.values?.["dither.invert"] ?? null,
      controlsCollapsed: state.panels?.controls?.collapsed ?? null,
      liveCollapsed: root.querySelector('[aria-label="Expand controls"]') !== null,
      duration: state.timeline?.durationSeconds ?? null,
      playing: state.timeline?.isPlaying ?? null,
      liveDuration: scrubber?.getAttribute("aria-valuemax") ?? null,
      mediaCount: state.mediaAssets?.length ?? 0,
      sourceName: source?.fileName ?? null,
      resourceRef: source?.resourceRef ?? null,
      sourceRotation: source?.transform?.rotationDeg ?? 0,
    };
  });
  let expectedPixels = "";
  await expectToolcraftPersistenceState(observation,
    session.targetAction("canvas.size.width", async () => {
      const width = await getToolcraftControlFieldByTarget(page, "canvas.size.width");
      await width.locator("input").first().fill("256");
      await width.locator("input").first().press("Enter");
      const invert = await getToolcraftControlFieldByTarget(page, "dither.invert");
      await invert.getByRole("switch").click();
      const source = await getToolcraftControlFieldByTarget(page, "source.image");
      await source.getByRole("button", { name: "90° Right", exact: true }).click();
      const timeline = await getToolcraftControlFieldByTarget(page, "panels.timeline.extended");
      const toggle = timeline.getByRole("switch");
      if (await toggle.getAttribute("aria-checked") !== "true") await toggle.click();
      await page.getByRole("button", { name: "Edit timeline duration", exact: true }).click();
      const editor = page.getByRole("textbox", { name: "timeline duration", exact: true });
      await editor.fill("3s");
      await editor.press("Enter");
      await page.getByRole("button", { name: "Collapse controls", exact: true }).click();
      await expect(runtime).toHaveAttribute("data-toolcraft-persistence-status", "success");
      expectedPixels = await getToolcraftProductObservableSnapshot(page, { selector: ditherOutput });
    }), session.reload(), {
      persistedKeys: ["canvas", "mediaAssets", "panels", "timeline", "values"],
      width: 256, liveWidth: "256px", inverted: true,
      controlsCollapsed: true, liveCollapsed: true,
      duration: 3, playing: false, liveDuration: "3",
      mediaCount: 1, sourceName: "dither-gradient.png", resourceRef: originalResource, sourceRotation: 90,
    }, {
      requirementId: "persistence.reload",
      assertRestoredOutput: async () => {
        expect(persistence.include.slice().sort()).toEqual(["canvas", "media", "panels", "timeline", "values"]);
        await expect.poll(() => getToolcraftProductObservableSnapshot(page, { selector: ditherOutput })).toBe(expectedPixels);
      },
    });
});
