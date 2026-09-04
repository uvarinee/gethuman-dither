import { expect, test } from "./toolcraft-product-test";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { ditherOutput, setDitherSwitch } from "./product-dither-helpers";
import { chooseDitherExport, downloadDither, prepareDitherExport, setDitherDuration } from "./product-dither-export-helpers";
import { expectToolcraftBackgroundOutputSemantics } from "./browser-background-output-evidence";
import { expectToolcraftInfinityCanvasBackgroundEvidence, observeInfinityCanvasBackground } from "./browser-infinity-canvas-evidence";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { inspectToolcraftVideoDownload } from "./video-artifact-inspection";
import { createToolcraftVideoFrameSchedule } from "../src/toolcraft/runtime/export/video-frame-schedule";

test("browser: Background color changes dither output", async ({ page }) => {
  const session = await prepareDitherExport(page);
  await expectToolcraftProductObservableToChange(session,
    session.controlAction("appearance.background", async (field) => {
      const input = field.locator("input").first();
      await input.fill("#205080"); await input.press("Enter");
    }), { requirementId: "background.color", selector: ditherOutput });
});

test("browser: Background changes dither output", async ({ page }) => {
  const session = await prepareDitherExport(page);
  const color = await getToolcraftControlFieldByTarget(page, "appearance.background");
  await color.locator("input").first().fill("#205080");
  await color.locator("input").first().press("Enter");
  await chooseDitherExport(page, "export.image.format", "PNG");
  await chooseDitherExport(page, "export.image.resolution", "2K");
  await setDitherDuration(page, 1);
  await setDitherSwitch(page, "canvas.infinity", true);
  const infinite = await observeInfinityCanvasBackground(page);
  const observation = session.observe((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>("canvas[data-dither-output]");
    if (!canvas) throw new Error("Product raster missing");
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = false;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) { transparent = true; break; }
    // Infinity background belongs to the visible runtime viewport, not the
    // product raster. Observe its actual computed color as part of composition.
    const viewport = root.querySelector<HTMLElement>('[data-slot="toolcraft-runtime-canvas"]');
    const viewportPainted = viewport !== null && getComputedStyle(viewport).backgroundColor === "rgb(32, 80, 128)";
    const backgroundVisible = !transparent || viewportPainted;
    return { backgroundVisible, outputSignature: backgroundVisible ? "rendered-opaque-dither-background" : "rendered-transparent-dither-gaps" };
  });
  await expectToolcraftBackgroundOutputSemantics(observation,
    session.controlAction("export.includeBackground", async (field) => field.getByRole("switch").click()),
    { backgroundVisible: false, outputSignature: "rendered-transparent-dither-gaps" },
    session.targetAction("actions.output", async () => downloadDither(page, "Export PNG")),
    async (download) => {
      const result = await inspectToolcraftImageDownload({ page, download, backgroundRgba: [0, 0, 0, 0] });
      const alpha = Array.from(result.observation.normalizedPixels).filter((_, index) => index % 4 === 3);
      expect(Math.max(...alpha)).toBe(255);
      return { ...result.inspection, backgroundAlpha: Math.min(...alpha) };
    }, {
      requirementId: "background.include",
      video: {
        exportArtifact: session.targetAction("actions.output", async () => downloadDither(page, "Export Video")),
        inspectArtifact: async (download) => {
          const result = await inspectToolcraftVideoDownload({ page, download, schedule: createToolcraftVideoFrameSchedule(1), backgroundRgba: [32, 80, 128, 255] });
          const backgroundIncluded = result.observations.every((observation) => {
            const bytes = observation.normalizedPixels;
            let hasBackground = false;
            for (let i = 0; i < bytes.length; i += 4) {
              if (bytes[i + 3] !== 255) return false;
              if (Math.hypot(bytes[i] - 32, bytes[i + 1] - 80, bytes[i + 2] - 128) < 18) hasBackground = true;
            }
            return hasBackground;
          });
          return { ...result.inspection, backgroundIncluded };
        },
      },
    });
  const backgroundExcluded = await observeInfinityCanvasBackground(page);
  await setDitherSwitch(page, "export.includeBackground", true);
  const backgroundRestored = await observeInfinityCanvasBackground(page);
  await expectToolcraftInfinityCanvasBackgroundEvidence({ infinite, backgroundExcluded, backgroundRestored }, {
    requirementId: "background.include", target: "export.includeBackground", expectedBackgroundColor: "#205080",
  });
});
