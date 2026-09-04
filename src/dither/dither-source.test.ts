import { afterEach, describe, expect, it, vi } from "vitest";
import { getDitherSourcePixels, retainDitherSource } from "./dither-source";

const { decode } = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock("./dither-renderer", () => ({ decodeImageElement: decode }));

class ImageFixture {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding = "";
  src = "";
  static instances: ImageFixture[] = [];
  constructor() { ImageFixture.instances.push(this); }
}
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); ImageFixture.instances = []; });

describe("dither source leases", () => {
  it("waits for the exact replacement and never reuses previous pixels", async () => {
    vi.stubGlobal("Image", ImageFixture);
    const a = { width: 1, height: 1, data: new Uint8ClampedArray([1,1,1,255]) };
    const b = { width: 1, height: 1, data: new Uint8ClampedArray([2,2,2,255]) };
    decode.mockReturnValueOnce(a).mockReturnValueOnce(b);
    const first = retainDitherSource("a", "a.png");
    ImageFixture.instances[0].onload?.();
    expect(await getDitherSourcePixels("a")).toBe(a);
    first.release();
    const second = retainDitherSource("b", "b.png");
    let settled = false;
    const pending = getDitherSourcePixels("b").then((pixels) => { settled = true; return pixels; });
    await Promise.resolve();
    expect(settled).toBe(false);
    await expect(getDitherSourcePixels("a")).rejects.toThrow("not ready");
    ImageFixture.instances[1].onload?.();
    expect(await pending).toBe(b);
    expect(await getDitherSourcePixels("b")).toBe(b);
    expect(decode).toHaveBeenCalledTimes(2);
    second.release();
  });

  it("allows an already acquired frame to finish while releasing mounted ownership", async () => {
    vi.stubGlobal("Image", ImageFixture);
    const pixels = { width: 1, height: 1, data: new Uint8ClampedArray(4) };
    decode.mockReturnValue(pixels);
    const lease = retainDitherSource("in-flight", "image.png");
    const acquired = getDitherSourcePixels("in-flight");
    lease.release();
    ImageFixture.instances[0].onload?.();
    expect(await acquired).toBe(pixels);
    await expect(getDitherSourcePixels("in-flight")).rejects.toThrow("not ready");
  });
});
