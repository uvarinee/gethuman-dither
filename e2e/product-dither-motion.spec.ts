import { test } from "./toolcraft-product-test";
import { appSchema } from "../src/app/app-schema";
import { appControlSectionInventory } from "../src/app/app-acceptance-data";
import { getToolcraftControlApplicabilityCases, getToolcraftApplicabilityRequirementId } from "../src/app/app-acceptance";
import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { ditherOutput, prepareDither, seekDitherPhase, setDitherSwitch, startDitherSliderDrag } from "./product-dither-helpers";

const controls = [
  ["Flicker amount", "motion.flicker.amount", "motion.flicker-amount", "slider"],
  ["Flicker speed", "motion.flicker.speed", "motion.flicker-speed", "slider"],
  ["Breathing amount", "motion.breathing.amount", "motion.breathing-amount", "slider"],
] as const;

for (const [label, target, requirementId, kind] of controls) {
  test(`browser: ${label} changes dither output`, async ({ page }) => {
    const session = await prepareDither(page);
    await seekDitherPhase(page);
    let alternate = false;
    const mutate = async (id: string) => {
      alternate = !alternate;
      try {
        await expectToolcraftProductObservableToChange(session,
          session.controlAction(target, async field => {
            if (kind === "slider") await startDitherSliderDrag(page, target, alternate ? 0.9 : 0.15);
            else {
              const input = field.getByRole("textbox");
              await input.fill(alternate ? "#00FF88" : "#AA22FF");
              await input.press("Enter");
            }
          }), { requirementId: id, selector: ditherOutput });
      } finally { await page.mouse.up(); }
    };
    await mutate(requirementId);
    for (const applicabilityCase of getToolcraftControlApplicabilityCases({ schema: appSchema, sectionInventory: appControlSectionInventory, target })) {
      await expectToolcraftControlApplicabilityState(session,
        session.controlAction(applicabilityCase.selectorTarget, async () => setDitherSwitch(page, applicabilityCase.selectorTarget, Boolean(applicabilityCase.selectorValue))),
        applicabilityCase, { baseRequirementId: requirementId });
      if (applicabilityCase.expectation === "visible") await mutate(getToolcraftApplicabilityRequirementId(requirementId, applicabilityCase));
    }
  });
}

for (const [label, target, requirementId] of [
  ["Flicker", "motion.flicker.enabled", "motion.flicker"],
  ["Breathing", "motion.breathing.enabled", "motion.breathing"],
] as const) {
  test(`browser: ${label} changes dither output`, async ({ page }) => {
    const session = await prepareDither(page);
    await seekDitherPhase(page);
    await expectToolcraftProductObservableToChange(session,
      session.controlAction(target, async field => field.getByRole("switch").click()),
      { requirementId, selector: ditherOutput });
  });
}
