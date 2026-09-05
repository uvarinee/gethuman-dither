import { describe, expect, it } from "vitest";

import { parsePins } from "./DitherCanvas";

const pin = (x: number, y: number) => [{
  radius: 100,
  color: "#FF4F2E",
  flashes: 2, fill: 25, hold: 20, clear: 25, branches: 0.65,
  position: { x: String(x), y: String(y) },
}];

describe("DitherCanvas pin projection", () => {
  it("maps normalized zero to the scene center", () => {
    expect(parsePins(pin(0, 0), 200, 100, 1)[0]?.position).toEqual({ x: 100, y: 50 });
  });

  it("maps normalized corners to the backing bounds", () => {
    expect(parsePins(pin(-1, -1), 200, 100, 1)[0]?.position).toEqual({ x: 0, y: 0 });
    expect(parsePins(pin(1, 1), 200, 100, 1)[0]?.position).toEqual({ x: 200, y: 100 });
  });

  it("preserves CSS-space position and radii across backing scales", () => {
    const oneX = parsePins(pin(0.5, -0.5), 200, 100, 1)[0]!;
    const twoX = parsePins(pin(0.5, -0.5), 400, 200, 2)[0]!;
    expect(twoX.position.x / 2).toBe(oneX.position.x);
    expect(twoX.position.y / 2).toBe(oneX.position.y);
    expect(twoX.radius / 2).toBe(oneX.radius);
  });
});
