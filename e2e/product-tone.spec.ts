import { expect, test } from "./toolcraft-product-test";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { ditherOutput, prepareDither, startDitherSliderDrag, uploadDitherSource } from "./product-dither-helpers";
import { expectToolcraftMediaLifecycle } from "./browser-state-evidence-helpers";
import { expectToolcraftSegmentedControlCellsPreservePadding, expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expectToolcraftCanvasRenderScaleEvidence } from "./browser-render-scale-evidence";

const liveSliders = [
  ["Blur", "tone.blur", "tone.blur", 0.55],
  ["Grain", "tone.grain", "tone.grain", 0.8],
  ["Gamma", "tone.gamma", "tone.gamma", 0.1],
  ["Black point", "tone.blackPoint", "tone.black-point", 0.5],
  ["White point", "tone.whitePoint", "tone.white-point", 0.4],
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
