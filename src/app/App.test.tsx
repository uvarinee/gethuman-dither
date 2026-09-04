import { describe, expect, it } from "vitest";

import { appIdentity } from "./app-identity";
import { appSchema } from "./app-schema";
import { STUDIO_PALETTE, STUDIO_SHELL } from "./studio-shell";

describe("Interactive Dither Studio shell", () => {
  it("publishes the three-region workspace landmarks", () => {
    expect(appIdentity).toEqual({
      id: "interactive-dither-studio",
      title: "Interactive Dither Studio",
    });
    expect(STUDIO_SHELL.regions).toEqual([
      "project-rail",
      "inspector",
      "stage",
    ]);
    expect(appSchema.assembly.components).toEqual([
      "canvas",
      "controlsPanel",
      "timelinePanel",
      "toolbar",
    ]);
    expect(appSchema.panels.controls?.title).toBe("Dither controls");
    expect(appSchema.canvas.upload).toBe(true);
  });

  it("keeps the agreed visual palette as a stable product contract", () => {
    expect(STUDIO_PALETTE).toEqual({
      accent: "#ff5c30",
      canvas: "#0a0a09",
      ink: "#f3f1eb",
      line: "#30302c",
      muted: "#8c8a82",
    });
  });
});
