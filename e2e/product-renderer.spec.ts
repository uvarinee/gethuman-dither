import { expect, test } from "./toolcraft-product-test";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { ditherOutput, prepareDither, startDitherSliderDrag, uploadDitherSource } from "./product-dither-helpers";
import { expectToolcraftMediaLifecycle } from "./browser-state-evidence-helpers";
import { expectToolcraftSegmentedControlCellsPreservePadding, expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expectToolcraftCanvasRenderScaleEvidence } from "./browser-render-scale-evidence";

test("browser: dither canvas preserves selected backing pixels", async ({ page }) => {
  const session = await prepareDither(page);
  await expectToolcraftDiscreteSliderMarkers(page, "canvas.renderScale", "renderer.render-scale");
  await expectToolcraftProductObservableToChange(session,
    session.controlAction("canvas.renderScale", async control => control.getByRole("slider").press("Home")),
    { requirementId: "renderer.render-scale", selector: ditherOutput });
  await (await getToolcraftControlFieldByTarget(page, "canvas.renderScale")).getByRole("slider").press("End");
  await expectToolcraftCanvasRenderScaleEvidence(page, {
    canvasSelector: ditherOutput, requirementId: "renderer.render-scale", selectedScale: 2, target: "canvas.renderScale",
    stateTransitions: [
      { state: "interaction", run: async () => startDitherSliderDrag(page, "tone.gamma", 0.6) },
      { state: "playback", run: async () => { await page.mouse.up(); await page.getByRole("button", { name: "Play playback", exact: true }).click(); } },
      { state: "steady", run: async () => { await page.getByRole("button", { name: "Pause playback", exact: true }).click(); } },
    ],
  });
});
