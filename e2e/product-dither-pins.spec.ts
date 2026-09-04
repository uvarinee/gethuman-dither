import { expect, test } from "./toolcraft-product-test";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { ditherOutput, prepareDither, seekDitherPhase } from "./product-dither-helpers";
import { provePinExportClean } from "./product-dither-export-helpers";
import { dragCanvasHandle, expectCanvasHandlesUseToolcraftVisualLanguage } from "./canvas-handle-helpers";

test("browser: pin record fields affect its own highlight", async ({ page }) => {
  const session = await prepareDither(page);
  await seekDitherPhase(page);
  const pinControl = page.locator('[data-toolcraft-control-target="pins.items"]');
  for (const name of ["Core", "Blur", "Intensity"]) {
    await expectToolcraftProductObservableToChange(session,
      session.controlAction("pins.items", async () => pinControl.getByRole("slider", { name, exact: true }).press("End")),
      { selector: ditherOutput });
  }
  await expectToolcraftProductObservableToChange(session,
    session.controlAction("pins.items", async () => page.getByRole("button", { name: "Single", exact: true }).click()),
    { selector: ditherOutput });
});

test("browser: canvas pin drag updates its normalized position", async ({ page }) => {
  const session = await prepareDither(page);
  await seekDitherPhase(page);
  await expectCanvasHandlesUseToolcraftVisualLanguage(page);
  await expectToolcraftProductObservableToChange(session,
    session.targetAction("pins.items", async () => dragCanvasHandle(page, "dither-pin-handle", { x: 46, y: 28 }, { requirementId: "pins.drag", target: "pins.items" })),
    { requirementId: "pins.drag", selector: ditherOutput });
  await provePinExportClean(page);
});

test("browser: precise pin coordinates preserve the sibling pin", async ({ page }) => {
  const session = await prepareDither(page);
  await seekDitherPhase(page);
  await page.getByRole("button", { name: "Add Pin", exact: true }).click();
  const handles = page.getByTestId("dither-pin-handle");
  await expect(handles).toHaveCount(2);
  const sibling = await handles.nth(1).getAttribute("style");
  await expectToolcraftProductObservableToChange(session,
    session.controlAction("pins.items", async () => {
      await page.getByRole("button", { name: "Edit Position value", exact: true }).first().click();
      const input = page.getByRole("textbox", { name: "Position value", exact: true });
      await input.fill("-0.5, 0.4");
      await input.press("Enter");
    }), { selector: ditherOutput });
  await expect(page.getByRole("button", { name: "Edit Position value", exact: true }).first()).toContainText("-0.50, 0.40");
  await expect(handles.first()).not.toHaveAttribute("style", sibling!);
  await expect(handles.nth(1)).toHaveAttribute("style", sibling!);
  await expect(page.getByRole("button", { name: "Edit Position value", exact: true }).nth(1)).toContainText("0.00, 0.00");
});
