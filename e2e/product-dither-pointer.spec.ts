import { expect, test } from "./toolcraft-product-test";
import { appSchema } from "../src/app/app-schema";
import { appControlSectionInventory } from "../src/app/app-acceptance-data";
import { getToolcraftControlApplicabilityCases, getToolcraftApplicabilityRequirementId } from "../src/app/app-acceptance";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import { expectToolcraftProductObservableToChange, getToolcraftProductObservableSnapshot } from "./product-observable-helpers";
import { prepareCellPaint, readCellPaint, paintedCellCount } from "./product-dither-cell-paint-helpers";
import { ditherOutput, prepareDither, seekDitherPhase, setDitherSwitch } from "./product-dither-helpers";

async function hoverField(page: import("@playwright/test").Page) {
  const box = await page.locator(ditherOutput).boundingBox();
  if (!box) throw new Error("Missing source output");
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.3);
}

test("browser: Pointer response changes dither output", async ({ page }) => {
  const session = await prepareDither(page);
  await prepareCellPaint(page);
  await page.getByRole("button", { name: "Remove Pin", exact: true }).click();
  await setDitherSwitch(page, "pointer.enabled", true);
  for (const [target, key] of [["pointer.radius", "Home"], ["pointer.strength", "End"], ["pointer.size", "Home"], ["pointer.decay", "Home"]]) {
    await (await getToolcraftControlFieldByTarget(page, target)).getByRole("slider").press(key);
  }
  await setDitherSwitch(page, "pointer.enabled", false);
  const toggle = (await getToolcraftControlFieldByTarget(page, "pointer.enabled")).getByRole("switch");
  await toggle.focus();
  const idle = await readCellPaint(page);
  await expectToolcraftProductObservableToChange(session,
    session.controlAction("pointer.enabled", async () => { await toggle.press("Space"); await hoverField(page); }),
    { requirementId: "pointer.enabled", selector: ditherOutput });
  const hover = await readCellPaint(page);
  expect(paintedCellCount(hover)).toBeGreaterThan(paintedCellCount(idle));
  expect(hover.gaps).toEqual(idle.gaps);
  const farCells = (grid: typeof idle) => grid.cells.filter((_, i) => i % grid.columns < grid.columns * 0.25);
  expect(farCells(hover)).toEqual(farCells(idle));
  await page.locator(ditherOutput).screenshot({ path: ".toolcraft/browser-artifacts/pointer-cell-paint.png" });
  await page.mouse.move(1, 1);
  await expect.poll(() => readCellPaint(page)).toEqual(idle);
});

for (const [label, target, requirementId] of [
  ["Pointer radius", "pointer.radius", "pointer.radius"],
  ["Pointer strength", "pointer.strength", "pointer.strength"],
  ["Pointer decay", "pointer.decay", "pointer.decay"],
  ["Pointer speed", "pointer.speed", "pointer.speed"],
  ["Pointer softness", "pointer.softness", "pointer.softness"],
  ["Pointer size", "pointer.size", "pointer.size"],
] as const) {
  test(`browser: ${label} changes dither output`, async ({ page }) => {
    const session = await prepareDither(page);
    await seekDitherPhase(page);
    await setDitherSwitch(page, "pointer.enabled", true);
    let useEnd = false;
    const mutate = async (id: string) => {
      const field = await getToolcraftControlFieldByTarget(page, target);
      if (target === "pointer.decay") await field.getByRole("slider").press("End");
      // Focus before positioning the mouse: keyboard tuning keeps the visible field active.
      await field.getByRole("slider").focus();
      await hoverField(page);
      await expectToolcraftProductObservableToChange(session,
        session.controlAction(target, async control => {
          await control.getByRole("slider").press(useEnd ? "End" : "Home");
          if (target === "pointer.decay") await page.mouse.move(1, 1);
        }), { requirementId: id, selector: ditherOutput });
      useEnd = !useEnd;
    };
    await mutate(requirementId);
    for (const applicabilityCase of getToolcraftControlApplicabilityCases({ schema: appSchema, sectionInventory: appControlSectionInventory, target })) {
      await expectToolcraftControlApplicabilityState(session,
        session.controlAction(applicabilityCase.selectorTarget, async () => setDitherSwitch(page, applicabilityCase.selectorTarget, Boolean(applicabilityCase.selectorValue))),
        applicabilityCase, { baseRequirementId: requirementId });
      if (applicabilityCase.expectation === "visible") {
        if (target === "pointer.decay") useEnd = false;
        await mutate(getToolcraftApplicabilityRequirementId(requirementId, applicabilityCase));
      }
    }
    if (target === "pointer.decay") {
      await page.mouse.move(1, 1);
      const idle = await getToolcraftProductObservableSnapshot(page, { selector: ditherOutput });
      await (await getToolcraftControlFieldByTarget(page, target)).getByRole("slider").press("End");
      await expect((await getToolcraftControlFieldByTarget(page, target)).getByRole("slider")).toHaveAttribute("aria-valuenow", "0.99");
      await hoverField(page);
      await expect.poll(() => getToolcraftProductObservableSnapshot(page, { selector: ditherOutput })).not.toBe(idle);
      await page.mouse.move(1, 1);
      await page.evaluate(() => new Promise<void>(resolve => { let frames = 0; const tick = () => ++frames === 10 ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick); }));
      expect(await getToolcraftProductObservableSnapshot(page, { selector: ditherOutput })).not.toBe(idle);
    }
  });
}
