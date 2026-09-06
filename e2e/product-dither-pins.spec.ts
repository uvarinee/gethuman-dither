import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { expect, test } from "./toolcraft-product-test";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { ditherOutput, prepareDither, seekDitherPhase } from "./product-dither-helpers";
import { chooseDitherExport, downloadDither } from "./product-dither-export-helpers";
import { dragCanvasHandle, expectCanvasHandlesUseToolcraftVisualLanguage, expectExportExcludesCanvasHandles } from "./canvas-handle-helpers";

test("browser: canvas pin drag updates its normalized position", async ({ page }) => {
  const session = await prepareDither(page);
  await seekDitherPhase(page);
  const radius = page.locator('[data-toolcraft-control-target="pins.items"]').getByRole("slider", { name: "Radius", exact: true }).first();
  await radius.press("Home");
  for (let i = 0; i < 22; i++) await radius.press("ArrowRight");
  await expectCanvasHandlesUseToolcraftVisualLanguage(page);
  await expectToolcraftProductObservableToChange(session,
    session.targetAction("pins.items", async () => dragCanvasHandle(page, "dither-pin-handle", { x: 46, y: 28 }, { requirementId: "pins.drag", target: "pins.items" })),
    { requirementId: "pins.drag", selector: ditherOutput });
  await chooseDitherExport(page, "export.image.format", "PNG");
  await chooseDitherExport(page, "export.image.resolution", "2K");
  await expectExportExcludesCanvasHandles(page, () => downloadDither(page, "Export PNG"),
    async download => (await inspectToolcraftImageDownload({ page, download, backgroundRgba: [10, 10, 10, 255] })).inspection,
    { requirementId: "pins.drag", target: "pins.items" });
});

test("browser: precise pin coordinates preserve the sibling pin", async ({ page }) => {
  const session = await prepareDither(page);
  await seekDitherPhase(page);
  const radius = page.locator('[data-toolcraft-control-target="pins.items"]').getByRole("slider", { name: "Radius", exact: true }).first();
  await radius.press("Home");
  for (let i = 0; i < 22; i++) await radius.press("ArrowRight");
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
