import { test } from "./toolcraft-product-test";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { ditherOutput, prepareDither, seekDitherPhase } from "./product-dither-helpers";

test("browser: Particle color changes dither output", async ({ page }) => {
  const session = await prepareDither(page);
    await seekDitherPhase(page);
  await expectToolcraftProductObservableToChange(session,
    session.controlAction("dither.ink", async field => {
      const input = field.getByRole("textbox");
      await input.fill("#00FF88");
      await input.press("Enter");
    }), { requirementId: "dither.ink", selector: ditherOutput });
});
