import { expect, test } from "./toolcraft-product-test";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { ditherOutput, prepareDither, startDitherSliderDrag, uploadDitherSource } from "./product-dither-helpers";
import { expectToolcraftMediaLifecycle } from "./browser-state-evidence-helpers";
import { expectToolcraftSegmentedControlCellsPreservePadding, expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expectToolcraftCanvasRenderScaleEvidence } from "./browser-render-scale-evidence";

test("browser: Source image changes dither output", async ({ page }) => {
  const session = await prepareDither(page);
  const dimensions = await page.locator(ditherOutput).evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    return [canvas.width, canvas.height];
  });
  for (const name of ["90° Right", "Flip horizontal", "Flip vertical"]) {
    await expectToolcraftProductObservableToChange(session,
      session.targetAction("source.image", async () => page.getByRole("button", { name, exact: true }).click()),
      { selector: ditherOutput });
  }
  expect(dimensions.every(value => value > 0)).toBe(true);
  await expect((await getToolcraftControlFieldByTarget(page, "canvas.size.width")).locator("input")).toHaveValue("320");
  await expect((await getToolcraftControlFieldByTarget(page, "canvas.size.height")).locator("input")).toHaveValue("180");
  const media = session.observe(root => {
    const images = Array.from(root.querySelectorAll<HTMLImageElement>('img[alt="dither-gradient.png"]'));
    const canvas = root.querySelector<HTMLCanvasElement>("canvas[data-dither-output]");
    let hasInk = false;
    if (canvas && canvas.width && canvas.height) {
      const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      hasInk = pixels.some((value, index) => index % 4 !== 3 && value > 40);
    }
    return { itemIds: images.map(image => image.currentSrc), outputSignature: hasInk ? "visible-dither-ink" : "empty" };
  });
  await expectToolcraftMediaLifecycle(media,
    session.controlAction("source.image", async (field) => field.getByRole("button", { name: "Remove dither-gradient.png" }).click()),
    { itemIds: [], outputSignature: "empty" }, { requirementId: "source.image" });
  await uploadDitherSource(page);
  await page.getByRole("button", { name: "Reset Source section", exact: true }).click();
  await expect(page.getByRole("img", { name: "dither-gradient.png", exact: true })).toHaveCount(0);
});
