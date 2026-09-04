import { describe, expect, it } from "vitest";

import {
  appAcceptance,
  appControlSectionInventory,
  appProductReadiness,
  appTransferMode,
} from "./app-acceptance-data";
import {
  appPerformance,
  appPerformanceAssessment,
  appPerformancePaths,
  appRendererPipelineRegistration,
} from "./app-performance";
import { appSchema } from "./app-schema";

function controlsByTarget() {
  return new Map(
    (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
      Object.values(section.controls).map((control) => [control.target, control] as const),
    ),
  );
}

describe("Interactive Dither Studio product contract", () => {
  it("declares the complete entity-first control inventory", () => {
    expect(appControlSectionInventory.map(({ id }) => id)).toEqual([
      "background", "source", "tone", "dither", "motion", "pointer", "pins",
      "image-export", "video-export",
    ]);
    expect(appControlSectionInventory.find(({ id }) => id === "dither")?.finiteSelectors)
      .toEqual([
        expect.objectContaining({ role: "parameter", target: "dither.algorithm" }),
        expect.objectContaining({ role: "parameter", target: "dither.invert" }),
      ]);
    expect(appControlSectionInventory.find(({ id }) => id === "motion")?.finiteSelectors)
      .toEqual([
        expect.objectContaining({ role: "branch", target: "motion.shimmer.enabled" }),
        expect.objectContaining({ role: "branch", target: "motion.breathing.enabled" }),
      ]);
  });

  it("uses runtime-owned setup, media, timeline, and delivery surfaces", () => {
    expect(appSchema.canvas).toMatchObject({
      renderScale: { defaultValue: 2, enabled: true, max: 2, min: 1 },
      size: { height: 1080, width: 1920 },
      sizing: { mode: "editable-output" },
    });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toMatchObject({
      defaultDurationSeconds: 7.2, enabled: true, mode: "playback",
    });
    expect(appSchema.persistence.storage).toBe("localStorage");
    expect(appSchema.persistence.storage === "localStorage" && appSchema.persistence.include)
      .toEqual(["canvas", "media", "panels", "timeline", "values"]);
    expect(controlsByTarget().get("actions.output")?.actions?.map((action) =>
      typeof action === "string" ? action : action.value,
    )).toEqual(["export.png", "export.video"]);
  });

  it("declares canonical defaults and hides inactive motion and pointer branches", () => {
    const controls = controlsByTarget();
    expect(controls.get("source.image")).toMatchObject({
      assetKind: "image", defaultValue: null, type: "fileDrop",
    });
    expect(controls.get("dither.algorithm")?.defaultValue).toBe("floyd-steinberg");
    expect(controls.get("dither.pixelSize")).toMatchObject({
      defaultValue: 2, max: 16, min: 1, performanceRole: "workload",
    });
    expect(controls.get("motion.shimmer.amount")?.applicability).toMatchObject({
      all: [{ equals: true, target: "motion.shimmer.enabled" }], mode: "conditional",
    });
    expect(controls.get("motion.breathing.amount")?.applicability).toMatchObject({
      all: [{ equals: true, target: "motion.breathing.enabled" }], mode: "conditional",
    });
    expect(controls.get("pointer.radius")?.applicability).toMatchObject({
      all: [{ equals: true, target: "pointer.enabled" }], mode: "conditional",
    });
  });

  it("records explicit product, animation, export, and interaction intent", () => {
    expect(appProductReadiness).toMatchObject({
      exportIntent: {
        image: { mode: "user-requested" }, svg: { mode: "not-requested" },
        video: { mode: "user-requested" },
      },
      mode: "product", viewInteraction: { mode: "non-spatial" },
    });
    expect(appProductReadiness.mode === "product" && appProductReadiness.interactionOwnership)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          capability: "direct-spatial-edit", id: "pin-position-drag",
          surface: "canvas", target: "pins.items",
        }),
        expect.objectContaining({
          capability: "precise-value-entry", id: "pin-position-entry",
          surface: "panel", target: "pins.items",
        }),
      ]));
    expect(appTransferMode).toMatchObject({
      animationIntent: { loopDuration: { seconds: 7.2 }, mode: "timeline-playback" },
      mode: "new-toolcraft-app", referenceInputs: [],
    });
  });

  it("declares persistence, render-scale, timeline, image, and video acceptance", () => {
    expect(appAcceptance.find(({ id }) => id === "persistence.reload")).toMatchObject({
      persistenceCoverage: "reload",
      persistenceSlices: ["canvas", "media", "panels", "timeline", "values"],
    });
    expect(appAcceptance.find(({ id }) => id === "renderer.render-scale")).toMatchObject({
      renderScaleCoverage: {
        kind: "selected-backing-pixels", states: ["interaction", "playback", "steady"],
      },
    });
    expect(appAcceptance.find(({ id }) => id === "timeline.playback")).toMatchObject({
      timelineCoverage: "playback",
      timelineLoopProof: {
        direction: "forward-only", durationChange: "reproved-after-edit",
        reversePlayback: "forbidden", seam: "first-last-match",
      },
    });
    expect(appAcceptance.find(({ id }) => id === "export.image")).toMatchObject({
      exportArtifactCoverage: "all-required-image-export-behavior",
    });
    expect(appAcceptance.find(({ id }) => id === "export.video")).toMatchObject({
      exportArtifactCoverage: "all-required-video-export-behavior",
    });
  });

  it("publishes one structurally valid Canvas 2D renderer plan", () => {
    expect(appPerformance.usesCustomRenderer).toBe(true);
    expect(appPerformance.rendererTechnique).toMatchObject({
      exportRenderer: "canvas-2d", previewRenderer: "canvas-2d",
      productRepresentation: "pixel",
    });
    expect(appRendererPipelineRegistration.runtimeId).toBe("interactive-dither-canvas-2d-v1");
    expect(appRendererPipelineRegistration.passes.map(({ id }) => id)).toEqual([
      "source-decode", "tone-map", "dither-build", "dynamic-field",
      "preview-present", "export-frame",
    ]);
    expect(appPerformanceAssessment.errors).toEqual([]);
    expect(appPerformancePaths.length).toBeGreaterThan(0);
    expect(appPerformance.scenarios).toHaveLength(appPerformancePaths.length);
  });
});
