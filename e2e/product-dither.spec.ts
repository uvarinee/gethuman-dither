import { expect, test } from "./toolcraft-product-test";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { ditherOutput, prepareDither, startDitherSliderDrag, uploadDitherSource } from "./product-dither-helpers";
import { expectToolcraftMediaLifecycle } from "./browser-state-evidence-helpers";
import { expectToolcraftSegmentedControlCellsPreservePadding, expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expectToolcraftCanvasRenderScaleEvidence } from "./browser-render-scale-evidence";

const liveSliders = [
  ["Pixel size", "dither.pixelSize", "dither.pixel-size", 0.75],
  ["Threshold", "dither.threshold", "dither.threshold", 0.8],
] as const;

for (const [label, target, requirementId, ratio] of liveSliders) {
  test(`browser: ${label} changes dither output`, async ({ page }) => {
    const session = await prepareDither(page);
    try {
      await expectToolcraftProductObservableToChange(session,
        session.controlAction(target, async () => startDitherSliderDrag(page, target, ratio)),
        { requirementId, selector: ditherOutput });
    } finally { await page.mouse.up(); }
  });
}

test("browser: Invert changes dither output", async ({ page }) => {
  const session = await prepareDither(page);
  await expectToolcraftProductObservableToChange(session,
    session.controlAction("dither.invert", async (control) => control.getByRole("switch").click()),
    { requirementId: "dither.invert", selector: ditherOutput });
});

test("browser: Algorithm changes dither output", async ({ page }) => {
  const session = await prepareDither(page);
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Algorithm", { target: "dither.algorithm", requirementId: "dither.algorithm" });
  for (const name of ["Bayer", "Random", "F-S"]) {
    const control = await getToolcraftControlFieldByTarget(page, "dither.algorithm");
    await expectToolcraftProductObservableToChange(session,
      session.controlAction("dither.algorithm", async (field) => field.getByRole("button", { name, exact: true }).click()),
      { ...(name === "F-S" ? { requirementId: "dither.algorithm" } : {}), selector: ditherOutput });
    await expect(control.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
  }
});
