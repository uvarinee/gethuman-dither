import { expect, test } from "./toolcraft-product-test";
import { readToolcraftBrowserObservation } from "./browser-proof-session";
import { expectToolcraftCompoundControlPartOutcome } from "./browser-state-evidence-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { prepareCellPaint, readCellPaint, paintedCellCount } from "./product-dither-cell-paint-helpers";
import { ditherOutput, prepareDither, seekDitherPhase } from "./product-dither-helpers";

test("browser: Pins changes dither output", async ({ page }) => {
  const session = await prepareDither(page);
  await prepareCellPaint(page);
  await seekDitherPhase(page);
  const observe = session.observe(root => ({
    count: root.querySelectorAll('[data-testid="dither-pin-handle"]').length,
    pixels: root.querySelector<HTMLCanvasElement>('canvas[data-dither-output]')!.toDataURL(),
  }));
  const initial = await readToolcraftBrowserObservation(observe);
  expect(initial.count).toBe(1);
  const painted = await readCellPaint(page);
  expect(painted.cells.some(([r, g]) => r > g * 1.3 && r > 60)).toBe(true);
  await page.locator(ditherOutput).screenshot({ path: ".toolcraft/browser-artifacts/point-cell-paint.png" });
  await page.getByRole("button", { name: "Remove Pin", exact: true }).click();
  await expect(page.getByTestId("dither-pin-handle")).toHaveCount(0);
  const empty = await readToolcraftBrowserObservation(observe);
  expect(empty.pixels).not.toEqual(initial.pixels);
  const unpainted = await readCellPaint(page);
  expect(paintedCellCount(painted)).toBe(paintedCellCount(unpainted));
  expect(painted.gaps).toEqual(unpainted.gaps);
  expect(unpainted.cells.some(([r, g]) => r > g * 1.3 && r > 60)).toBe(false);
  await expectToolcraftCompoundControlPartOutcome(observe,
    session.controlAction("pins.items", async () => page.getByRole("button", { name: "Add Pin", exact: true }).click()),
    initial, { requirementId: "pins.items", part: "collectionActions.add" });
  await expectToolcraftProductObservableToChange(session,
    session.controlAction("pins.items", async () => {
      const hex = page.getByRole("textbox", { name: "Color hex", exact: true });
      await hex.fill("#00FF00"); await hex.press("Enter");
    }), { requirementId: "pins.items", selector: ditherOutput });
  await expectToolcraftCompoundControlPartOutcome(observe,
    session.controlAction("pins.items", async () => {
      const hex = page.getByRole("textbox", { name: "Color hex", exact: true });
      await hex.fill("#FF4F2E"); await hex.press("Enter");
    }), initial, { requirementId: "pins.items", part: "collectionActions.items" });
  await expectToolcraftCompoundControlPartOutcome(observe,
    session.controlAction("pins.items", async () => page.getByRole("button", { name: "Remove Pin", exact: true }).click()),
    empty, { requirementId: "pins.items", part: "collectionActions.remove" });
  await page.getByRole("button", { name: "Add Pin", exact: true }).click();
  const pinControl = page.locator('[data-toolcraft-control-target="pins.items"]');
  const blur = pinControl.getByRole("slider", { name: "Blur", exact: true });
  await blur.scrollIntoViewIfNeeded();
  const thumb = await blur.boundingBox();
  if (!thumb) throw new Error("Missing Point Blur thumb");
  const previousBlur = await blur.getAttribute("aria-valuenow");
  try {
    await expectToolcraftProductObservableToChange(session,
      session.controlAction("pins.items", async () => {
        await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
        await page.mouse.down();
        await page.mouse.move(thumb.x + thumb.width / 2 + 30, thumb.y + thumb.height / 2, { steps: 6 });
        await expect(blur).not.toHaveAttribute("aria-valuenow", previousBlur!);
      }), { selector: ditherOutput });
    expect((await readCellPaint(page)).gaps).toEqual(unpainted.gaps);
  } finally { await page.mouse.up(); }
  for (const name of ["Core", "Intensity"]) {
    await expectToolcraftProductObservableToChange(session,
      session.controlAction("pins.items", async () => pinControl.getByRole("slider", { name, exact: true }).press(name === "Intensity" ? "Home" : "End")),
      { selector: ditherOutput });
  }
});

