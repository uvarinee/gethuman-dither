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
  const pinControl = page.locator('[data-toolcraft-control-target="pins.items"]');
  const solid = async () => {
    for (const name of ["Noise amount", "Soft edge", "Scatter"]) await pinControl.getByRole("slider", { name, exact: true }).press("Home");
    await pinControl.getByRole("slider", { name: "Color mix", exact: true }).press("End");
  };
  const setRadius = async () => {
    await pinControl.getByRole("button", { name: "Edit Radius value", exact: true }).click();
    const editor = page.getByRole("textbox", { name: "Radius value", exact: true });
    await editor.fill("24"); await editor.press("Enter");
  };
  await solid();
  const radius = page.locator('[data-toolcraft-control-target="pins.items"]').getByRole("slider", { name: "Radius", exact: true });
  await setRadius();
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
  await page.getByRole("button", { name: "Remove Pin", exact: true }).click();
  await expect(page.getByTestId("dither-pin-handle")).toHaveCount(0);
  const empty = await readToolcraftBrowserObservation(observe);
  expect(empty.pixels).not.toEqual(initial.pixels);
  const unpainted = await readCellPaint(page);
  expect(paintedCellCount(painted)).toBe(paintedCellCount(unpainted));
  expect(painted.gaps).toEqual(unpainted.gaps);
  expect(unpainted.cells.some(([r, g]) => r > g * 1.3 && r > 60)).toBe(false);
  await expectToolcraftCompoundControlPartOutcome(observe,
    session.controlAction("pins.items", async () => { await page.getByRole("button", { name: "Add Pin", exact: true }).click(); await solid(); await setRadius(); }),
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
  await solid();
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
  // Independent color noise, soft edge and optional displacement each affect output.
  for (const [name, key] of [["Color mix", "Home"], ["Noise amount", "End"], ["Noise speed", "End"], ["Soft edge", "End"], ["Scatter", "End"]] as const) {
    await expectToolcraftProductObservableToChange(session, session.controlAction("pins.items", async () => {
      await pinControl.getByRole("slider", { name, exact: true }).press(key);
    }), { selector: ditherOutput });
  }
  await pinControl.getByRole("slider", { name: "Scatter", exact: true }).press("Home");
  const grid = await readCellPaint(page);
  expect(grid.gaps).toEqual(unpainted.gaps);
  const first = grid.cells;
  await seekDitherPhase(page, 0.37);
  await expect.poll(async () => (await readCellPaint(page)).cells).not.toEqual(first);
  await pinControl.getByRole("slider", { name: "Noise speed", exact: true }).press("Home");
  const frozen = (await readCellPaint(page)).cells;
  await seekDitherPhase(page, 0.63);
  expect((await readCellPaint(page)).cells).toEqual(frozen);
  await pinControl.getByRole("slider", { name: "Scatter", exact: true }).press("End");
  await expect.poll(async () => (await readCellPaint(page)).gaps).not.toEqual(grid.gaps);
});
