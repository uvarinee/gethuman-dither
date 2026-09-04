import { expect, type Page } from "@playwright/test";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { ditherOutput, setDitherSwitch } from "./product-dither-helpers";

export async function prepareCellPaint(page: Page) {
  await setDitherSwitch(page, "motion.flicker.enabled", false);
  await setDitherSwitch(page, "motion.breathing.enabled", false);
  const pixel = (await getToolcraftControlFieldByTarget(page, "dither.pixelSize")).getByRole("slider");
  await pixel.press("Home");
  for (let i = 1; i < 8; i++) await pixel.press("ArrowRight");
  await expect(pixel).toHaveAttribute("aria-valuenow", "8");
}

export async function readCellPaint(page: Page) {
  return page.locator(ditherOutput).evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    const style = getComputedStyle(canvas);
    const columns = Math.ceil(parseFloat(style.width) / 8);
    const rows = Math.ceil(parseFloat(style.height) / 8);
    const cellWidth = canvas.width / columns, cellHeight = canvas.height / rows;
    const sample = (x: number, y: number) => {
      const index = (Math.min(canvas.height - 1, Math.floor(y)) * canvas.width + Math.min(canvas.width - 1, Math.floor(x))) * 4;
      return Array.from(pixels.slice(index, index + 4));
    };
    const cells = [], gaps = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      cells.push(sample((x + 0.5) * cellWidth, (y + 0.5) * cellHeight));
      gaps.push(sample(x * cellWidth, y * cellHeight));
    }
    return { columns, rows, cells, gaps };
  });
}

export const paintedCellCount = (grid: Awaited<ReturnType<typeof readCellPaint>>) => grid.cells.filter(rgb => Math.max(...rgb.slice(0, 3)) > 20).length;
