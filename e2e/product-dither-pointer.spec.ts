import { expect, test } from "./toolcraft-product-test";
import { appSchema } from "../src/app/app-schema";
import { appControlSectionInventory } from "../src/app/app-acceptance-data";
import { getToolcraftControlApplicabilityCases, getToolcraftApplicabilityRequirementId } from "../src/app/app-acceptance";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import { expectToolcraftProductObservableToChange, getToolcraftProductObservableSnapshot } from "./product-observable-helpers";
import { prepareCellPaint, readCellPaint } from "./product-dither-cell-paint-helpers";
import { ditherOutput, prepareDither, setDitherSwitch } from "./product-dither-helpers";
async function hover(page: import("@playwright/test").Page) {
 const box = await page.locator(ditherOutput).boundingBox(); if (!box) throw Error("Missing output");
 await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.4);
}
async function prepare(page: import("@playwright/test").Page) {
 const session = await prepareDither(page); await prepareCellPaint(page);
 await page.getByRole("button", { name: "Remove Pin", exact: true }).click();
 return session;
}
test("browser: Pointer response changes dither output", async ({ page }) => {
 const session = await prepare(page);
 const idle = await getToolcraftProductObservableSnapshot(page, { selector: ditherOutput });
 const grid = await readCellPaint(page);
 await expectToolcraftProductObservableToChange(session, session.controlAction("pointer.enabled", async () => {
   await setDitherSwitch(page, "pointer.enabled", true); await hover(page);
 }), { requirementId: "pointer.enabled", selector: ditherOutput });
 const displaced = await readCellPaint(page);
 expect(displaced.gaps).not.toEqual(grid.gaps);
 await page.locator(ditherOutput).screenshot({ path: ".toolcraft/browser-artifacts/pointer-displaced.png" });
 await page.mouse.move(1, 1);
 expect(await getToolcraftProductObservableSnapshot(page, { selector: ditherOutput })).not.toBe(idle);
 await expect.poll(() => getToolcraftProductObservableSnapshot(page, { selector: ditherOutput }), { timeout: 15000 }).toBe(idle);
});
for (const [label, target] of [
 ["Pointer radius", "pointer.radius"], ["Pointer repel radius", "pointer.repelRadius"], ["Pointer repel force", "pointer.repelForce"],
 ["Pointer attract force", "pointer.attractForce"], ["Pointer return", "pointer.return"], ["Pointer inertia", "pointer.damping"],
] as const) test("browser: " + label + " changes dither output", async ({ page }) => {
 const session = await prepare(page);
 const mutate = async (id: string) => {
  await page.mouse.move(1, 1);
  await setDitherSwitch(page, "pointer.enabled", false);
  await setDitherSwitch(page, "pointer.enabled", true);
  // Expose an actual attraction annulus for that control's outcome.
  if (target === "pointer.attractForce") {
   await (await getToolcraftControlFieldByTarget(page, "pointer.repelRadius")).getByRole("slider").press("Home");
  }
  const slider = (await getToolcraftControlFieldByTarget(page, target)).getByRole("slider");
  await slider.press(target === "pointer.radius" ? "End" : "Home");
  await slider.focus();
  await expectToolcraftProductObservableToChange(session, session.controlAction(target, async () => {
   await slider.press(target === "pointer.radius" ? "Home" : "End"); await hover(page);
  }), { requirementId: id, selector: ditherOutput });
  await page.mouse.move(1, 1); await setDitherSwitch(page, "pointer.enabled", false);
 };
 await mutate(target);
 for (const c of getToolcraftControlApplicabilityCases({ schema: appSchema, sectionInventory: appControlSectionInventory, target })) {
  await expectToolcraftControlApplicabilityState(session, session.controlAction(c.selectorTarget, async () => setDitherSwitch(page, c.selectorTarget, Boolean(c.selectorValue))), c, { baseRequirementId: target });
  if (c.expectation === "visible") await mutate(getToolcraftApplicabilityRequirementId(target, c));
 }
});
