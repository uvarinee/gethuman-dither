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
  const radius = page.locator('[data-toolcraft-control-target="pins.items"]').getByRole("slider", { name: "Radius", exact: true });
  await radius.press("Home");
  for (let i = 0; i < 22; i++) await radius.press("ArrowRight");
  const observe = session.observe(root => ({
    count: root.querySelectorAll('[data-testid="dither-pin-handle"]').length,
    pixels: root.querySelector<HTMLCanvasElement>('canvas[data-dither-output]')!.toDataURL(),
  }));
  const initial = await readToolcraftBrowserObservation(observe);
  expect(initial.count).toBe(1);
  const painted = await readCellPaint(page);
  const colored = painted.cells.filter(([r, g]) => r > g * 1.3 && r > 60);
  expect(colored.length).toBeGreaterThan(0);
  for (const rgba of colored) expect(rgba).toEqual([255, 79, 46, 255]);
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
    session.controlAction("pins.items", async () => { await page.getByRole("button", { name: "Add Pin", exact: true }).click(); await radius.press("Home"); for (let i = 0; i < 22; i++) await radius.press("ArrowRight"); }),
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
  const blur = pinControl.getByRole("slider", { name: "Radius", exact: true });
  await blur.scrollIntoViewIfNeeded();
  const thumb = await blur.boundingBox();
  if (!thumb) throw new Error("Missing Pin Radius thumb");
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
  // Evaluate timing controls at phases where each promised operation is visible.
  const fill = pinControl.getByRole("slider", { name: "Fill time", exact: true });
  await fill.press("End");
  await seekDitherPhase(page, 0.1);
  await expectToolcraftProductObservableToChange(session, session.controlAction("pins.items", async () => fill.press("Home")), { selector: ditherOutput });
  await fill.press("End");
  await seekDitherPhase(page, 0.23);
  const hold = pinControl.getByRole("slider", { name: "Hold time", exact: true });
  await expectToolcraftProductObservableToChange(session, session.controlAction("pins.items", async () => hold.press("Home")), { selector: ditherOutput });
  await seekDitherPhase(page, 0.23);
  const clear = pinControl.getByRole("slider", { name: "Clear time", exact: true });
  await expectToolcraftProductObservableToChange(session, session.controlAction("pins.items", async () => clear.press("Home")), { selector: ditherOutput });
  await seekDitherPhase(page, 0.05);
  const branches = pinControl.getByRole("slider", { name: "Branching", exact: true });
  await expectToolcraftProductObservableToChange(session, session.controlAction("pins.items", async () => branches.press("Home")), { selector: ditherOutput });
  const flashes = pinControl.getByRole("slider", { name: "Flashes", exact: true });
  await expectToolcraftProductObservableToChange(session, session.controlAction("pins.items", async () => flashes.press("End")), { selector: ditherOutput });
});
