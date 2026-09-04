import { describe, expect, it, vi } from "vitest";
import { createToolcraftState, type ToolcraftState } from "@/toolcraft/runtime";
import { appSchema } from "@/app/app-schema";
import { ditherExportRenderer } from "./dither-export";
const { pixels } = vi.hoisted(() => ({ pixels: vi.fn() }));
vi.mock("./dither-source", () => ({ getDitherSourcePixels: pixels }));

describe("dither runtime export", () => {
  it("renders source-scoped deterministic content into runtime coordinates without clearing its background", async () => {
    const state = createToolcraftState(appSchema);
    state.values["motion.shimmer.enabled"] = false;
    state.values["motion.breathing.enabled"] = false;
    state.values["pins.items"] = [];
    state.mediaAssets = [{ id: "source", assetKind: "image", lifecycle: "ready", resourceRef: "exact-source", sourceTarget: "source.image", transform: { flipHorizontal: true } }] as ToolcraftState["mediaAssets"];
    pixels.mockResolvedValue({ width: 2, height: 1, data: new Uint8ClampedArray([255,255,255,255,0,0,0,255]) });
    const context = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), fillStyle: "" } as unknown as CanvasRenderingContext2D;
    const request = { context, frame: { x: -4, y: -2, width: 8, height: 4 }, pixelRatio: 2, rendererPipeline: null, state, timeSeconds: 0, timelineProgress: 0 };
    await ditherExportRenderer.renderFrame(request);
    const first = vi.mocked(context.fillRect).mock.calls.slice();
    vi.mocked(context.fillRect).mockClear();
    await ditherExportRenderer.renderFrame({ ...request, pixelRatio: 4 });
    expect(context.fillRect).toHaveBeenCalled();
    expect(vi.mocked(context.fillRect).mock.calls).toEqual(first);
    expect(context.clearRect).not.toHaveBeenCalled();
    expect(context.translate).toHaveBeenCalledWith(-4, -2);
    expect(pixels).toHaveBeenCalledWith("exact-source");
    expect(context.save).toHaveBeenCalledTimes(2);
    expect(context.restore).toHaveBeenCalledTimes(2);
  });
});
