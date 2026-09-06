import { describe, expect, it } from "vitest";

import { MAX_DITHER_EXPORT_PIXELS, MAX_DITHER_PINS, MAX_DITHER_PREVIEW_PIXELS, MAX_DITHER_SOURCE_PIXELS } from "@/dither/dither-limits";
import { appPerformance, appPerformanceAssessment, appPerformanceFixturePlans, appPerformancePaths, appRendererPipelineRegistration } from "./app-performance";

const interactions = appRendererPipelineRegistration.interactionInvalidation;
const interactionFor = (target: string, interaction = "control-change") =>
  interactions.find((entry) => entry.interaction === interaction && entry.targets.includes(target));

describe("dither pipeline fidelity", () => {
  it("recolors ink without rebuilding source luminance or the dither mask", () => {
    expect(interactionFor("dither.ink")).toMatchObject({
      invalidates: ["dynamic-field", "preview-present"],
      mustNotInvalidate: ["source-decode", "tone-map", "dither-build"],
    });
  });

  it("distinguishes source transforms, scene geometry, and backing-only changes", () => {
    expect(interactionFor("source.transform")?.invalidates).toContain("source-decode");
    expect(interactionFor("canvas.size")?.invalidates).toContain("dither-build");
    expect(interactionFor("canvas.renderScale")?.mustNotInvalidate).toContain("dither-build");
    expect(interactionFor("pins.items", "control-drag")?.invalidates).toEqual(["dynamic-field", "preview-present"]);
    expect(interactionFor("pointer.state", "control-drag")?.mustNotInvalidate).toContain("source-decode");
  });

  it("models simulation sample work separately from pin presentation", () => {
    expect(appRendererPipelineRegistration.passes.find(({ id }) => id === "dynamic-field")?.cost)
      .toMatchObject({ dimensions: ["preview-pixels", "sample-step"], relationship: "product" });
    expect(appRendererPipelineRegistration.passes.find(({ id }) => id === "preview-present")?.cost.dimensions)
      .toContain("pin-count");
  });

  it("uses the explicit supported rendering bounds including square 8K export", () => {
    const dimensions = new Map(appPerformance.workloadEnvelope.dimensions.map((dimension) => [dimension.id, dimension]));
    expect(dimensions.get("source-pixels")?.interactiveMax).toBe(MAX_DITHER_SOURCE_PIXELS);
    expect(dimensions.get("preview-pixels")?.interactiveMax).toBe(MAX_DITHER_PREVIEW_PIXELS);
    expect(dimensions.get("export-pixels")?.batchMax).toBe(MAX_DITHER_EXPORT_PIXELS);
    expect(MAX_DITHER_EXPORT_PIXELS).toBe(8192 * 8192);
    expect(dimensions.get("pin-count")?.interactiveMax).toBe(MAX_DITHER_PINS);
    const adapter = appPerformance.fixtureAdapters.dimensions["pin-count"];
    expect(adapter.kind).toBe("exhaustive-discrete");
    if (adapter.kind === "exhaustive-discrete") {
      expect(adapter.entries.map(({ value }) => value)).toEqual(Array.from({ length: MAX_DITHER_PINS + 1 }, (_, value) => value));
      for (const entry of adapter.entries) expect(adapter.observe(adapter.apply(entry.value))).toBe(entry.value);
    }
  });

  it("retains valid structural assessment and derives every scenario from canonical paths", () => {
    expect(appPerformanceAssessment.errors).toEqual([]);
    expect(appPerformance.scenarios.map(({ pathId }) => pathId)).toEqual(appPerformancePaths.map(({ id }) => id));
    expect(appPerformanceFixturePlans).toHaveLength(appPerformancePaths.filter(({ workloadDimensions }) => workloadDimensions.length > 0).length);
  });
});
