import {
  assessToolcraftRenderPlan,
  compileToolcraftPerformanceFixturePlan,
  defineToolcraftFixtureAdapter,
  defineToolcraftPerformance,
  deriveToolcraftPerformancePaths,
  registerToolcraftRendererPipeline,
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformanceScenario,
  type ToolcraftRendererPipelinePassContract,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";
import { MAX_DITHER_SOURCE_PIXELS, MAX_DITHER_PREVIEW_PIXELS, MAX_DITHER_EXPORT_PIXELS, MAX_DITHER_PINS } from "@/dither/dither-limits";

type DitherRendererPasses = {
  "source-decode": ToolcraftRendererPipelinePassContract<unknown>;
  "tone-map": ToolcraftRendererPipelinePassContract<unknown>;
  "dither-build": ToolcraftRendererPipelinePassContract<unknown>;
  "dynamic-field": ToolcraftRendererPipelinePassContract<unknown>;
  "preview-present": ToolcraftRendererPipelinePassContract<void>;
  "export-frame": ToolcraftRendererPipelinePassContract<void>;
};

const sourcePasses = ["source-decode", "tone-map", "dither-build"] as const;
const previewPasses = ["dynamic-field", "preview-present"] as const;

export const appRendererPipelineRegistration =
  registerToolcraftRendererPipeline<DitherRendererPasses>()({
    interactionInvalidation: [
      {
        interaction: "initial-render",
        invalidates: [...sourcePasses, ...previewPasses],
        targets: ["canvas.initial-render"],
      },
      {
        interaction: "media-import",
        invalidates: [...sourcePasses, ...previewPasses],
        targets: ["source.image"],
      },
      {
        interaction: "control-drag",
        invalidates: ["tone-map", "dither-build", ...previewPasses],
        mustNotInvalidate: ["source-decode"],
        targets: [
          "tone.blur",
          "tone.grain",
          "tone.gamma",
          "tone.blackPoint",
          "tone.whitePoint",
        ],
      },
      {
        interaction: "control-drag",
        invalidates: ["dither-build", ...previewPasses],
        mustNotInvalidate: ["source-decode", "tone-map"],
        targets: ["dither.pixelSize", "dither.threshold"],
      },
      {
        interaction: "control-change",
        invalidates: ["dither-build", ...previewPasses],
        mustNotInvalidate: ["source-decode", "tone-map"],
        targets: ["dither.algorithm", "dither.invert"],
      },
      {
        interaction: "control-drag",
        invalidates: [...previewPasses],
        mustNotInvalidate: [...sourcePasses],
        targets: [
          "motion.flicker.amount",
          "motion.flicker.speed",
          "motion.breathing.amount",
          "pointer.radius",
          "pointer.strength",
          "pointer.decay",
          "pointer.speed",
          "pointer.softness",
          "pointer.size",
        ],
      },
      {
        interaction: "control-change",
        invalidates: [...previewPasses],
        mustNotInvalidate: [...sourcePasses],
        targets: [
          "dither.ink",
          "export.includeBackground",
          "appearance.background",
          "motion.flicker.enabled",
          "motion.breathing.enabled",
          "pointer.enabled",
          "pins.items",
        ],
      },
      {
        interaction: "control-change",
        invalidates: [],
        mustNotInvalidate: [...sourcePasses, ...previewPasses],
        targets: [
          "export.image.format",
          "export.image.resolution",
          "export.video.format",
          "export.video.resolution",
        ],
      },
      {
        interaction: "control-change",
        invalidates: [...sourcePasses, ...previewPasses],
        targets: ["source.transform"],
      },
      {
        interaction: "control-change",
        invalidates: ["dither-build", ...previewPasses],
        mustNotInvalidate: ["source-decode", "tone-map"],
        targets: ["canvas.size"],
      },
      {
        interaction: "control-change",
        invalidates: [...previewPasses],
        mustNotInvalidate: [...sourcePasses],
        targets: ["canvas.renderScale", "canvas.devicePixelRatio"],
      },
      {
        interaction: "control-drag",
        invalidates: [...previewPasses],
        mustNotInvalidate: [...sourcePasses],
        targets: ["pointer.state", "pins.items"],
      },
      {
        interaction: "timeline-playback",
        invalidates: [...previewPasses],
        mustNotInvalidate: [...sourcePasses],
        targets: ["timeline.time"],
      },
      {
        interaction: "timeline-scrub",
        invalidates: [...previewPasses],
        mustNotInvalidate: [...sourcePasses],
        targets: ["timeline.time"],
      },
      {
        interaction: "viewport-drag",
        invalidates: [],
        mustNotInvalidate: [...sourcePasses, ...previewPasses],
        targets: ["canvas.viewport.offset"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: [...sourcePasses, ...previewPasses],
        targets: ["canvas.viewport.zoom"],
      },
      {
        interaction: "export",
        invalidates: ["export-frame"],
        mustNotInvalidate: [...sourcePasses, ...previewPasses],
        targets: ["actions.output"],
      },
    ],
    passes: [
      {
        cacheKey: ["source.mediaId", "source.transform"],
        cost: {
          dimensions: ["source-pixels"],
          frequency: "discrete",
          relationship: "linear",
        },
        id: "source-decode",
        inputs: ["source.image", "source.transform"],
        invalidatedBy: ["source.image", "source.transform"],
        kind: "decode",
        lifecycle: { cache: "memoized", resourceScope: "source" },
        output: "source",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: [
          "source-decode",
          "tone.blur",
          "tone.grain",
          "tone.gamma",
          "tone.blackPoint",
          "tone.whitePoint",
        ],
        cost: {
          dimensions: ["source-pixels"],
          frequency: "discrete",
          relationship: "linear",
        },
        id: "tone-map",
        inputs: ["source-decode", "tone.settings"],
        invalidatedBy: ["source-decode", "tone.settings"],
        kind: "preprocess",
        lifecycle: { cache: "memoized", resourceScope: "source" },
        output: "intermediate",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: ["tone-map", "dither.settings", "canvas.sceneFrame"],
        cost: {
          dimensions: ["preview-pixels", "sample-step"],
          frequency: "discrete",
          relationship: "product",
        },
        id: "dither-build",
        inputs: ["tone-map", "dither.settings", "canvas.sceneFrame"],
        invalidatedBy: ["tone-map", "dither.settings", "canvas.sceneFrame"],
        kind: "pixel-transform",
        lifecycle: { cache: "memoized", resourceScope: "source" },
        output: "intermediate",
        quality: "full",
        runsOn: "main",
      },
      {
        cost: {
          dimensions: [],
          frequency: "frame",
          relationship: "constant",
        },
        id: "dynamic-field",
        inputs: ["dither-build", "timeline.time", "motion.settings", "pointer.state", "pins.items", "dither.ink", "appearance.background", "export.includeBackground"],
        invalidatedBy: ["dither-build", "timeline.time", "motion.settings", "pointer.state", "pins.items", "dither.ink", "appearance.background", "export.includeBackground"],
        kind: "composite",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "intermediate",
        quality: "full",
        runsOn: "main",
      },
      {
        cost: {
          dimensions: ["preview-pixels", "pin-count"],
          frequency: "frame",
          relationship: "product",
        },
        id: "preview-present",
        inputs: ["dynamic-field", "destination.context"],
        invalidatedBy: ["dynamic-field", "destination.context"],
        kind: "composite",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "preview",
        quality: "retina",
        runsOn: "main",
      },
      {
        cost: {
          dimensions: ["export-pixels", "sample-step", "source-pixels", "pin-count"],
          frequency: "batch",
          relationship: "product",
        },
        id: "export-frame",
        inputs: ["source.image", "source.transform", "tone.settings", "dither.settings", "dither.ink", "timeline.time", "motion.settings", "pins.items", "appearance.background", "export.includeBackground", "destination.context"],
        invalidatedBy: ["export.frameState", "destination.context"],
        kind: "export",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
    runtimeId: "interactive-dither-canvas-2d-v1",
  });

export const sourceDecodePass = appRendererPipelineRegistration.getPass("source-decode");
export const toneMapPass = appRendererPipelineRegistration.getPass("tone-map");
export const ditherBuildPass = appRendererPipelineRegistration.getPass("dither-build");
export const dynamicFieldPass = appRendererPipelineRegistration.getPass("dynamic-field");
export const previewPresentPass = appRendererPipelineRegistration.getPass("preview-present");
export const exportFramePass = appRendererPipelineRegistration.getPass("export-frame");

const numericAdapter = (dimensionId: string) =>
  defineToolcraftFixtureAdapter<number>({
    apply: (value) => value,
    dimensionId,
    observe: (value) => value,
  });

const workloadEnvelope = {
  dimensions: [
    {
      batchMax: MAX_DITHER_SOURCE_PIXELS,
      defaultValue: 2_073_600,
      id: "source-pixels",
      interactiveMax: MAX_DITHER_SOURCE_PIXELS,
      mapping: "area",
      source: { id: "source.image.decodedPixels", kind: "external-input" },
      unit: "pixels",
    },
    {
      batchMax: MAX_DITHER_PREVIEW_PIXELS,
      defaultValue: 8_294_400,
      id: "preview-pixels",
      interactiveMax: MAX_DITHER_PREVIEW_PIXELS,
      mapping: "area",
      source: {
        kind: "runtime-state",
        path: "canvas.backingPixelsAtSelectedRenderScale",
      },
      unit: "pixels",
    },
    {
      batchMax: 1,
      defaultValue: 2,
      id: "sample-step",
      interactiveMax: 1,
      mapping: "direct",
      source: {
        kind: "schema-target",
        target: "dither.pixelSize",
        workloadBoundary: "minimum",
      },
      unit: "pixels",
    },
    {
      batchMax: MAX_DITHER_EXPORT_PIXELS,
      defaultValue: 9_437_184,
      id: "export-pixels",
      mapping: "area",
      source: { kind: "runtime-state", path: "export.outputPixels" },
      unit: "pixels",
    },
    {
      batchMax: MAX_DITHER_PINS,
      defaultValue: 1,
      id: "pin-count",
      interactiveMax: MAX_DITHER_PINS,
      mapping: "direct",
      source: { kind: "runtime-state", path: "values.pins.items.length" },
      unit: "pins",
    },
  ],
} satisfies ToolcraftEnvelopePerformanceConfig["workloadEnvelope"];

const fixtureAdapters = {
  dimensions: {
    "export-pixels": numericAdapter("export-pixels"),
    "preview-pixels": numericAdapter("preview-pixels"),
    "sample-step": numericAdapter("sample-step"),
    "source-pixels": numericAdapter("source-pixels"),
    "pin-count": defineToolcraftFixtureAdapter<number>({
      apply: (value) => value,
      dimensionId: "pin-count",
      kind: "exhaustive-discrete",
      domain: {
        kind: "runtime-state",
        path: "values.pins.items.length",
        attestation: "The renderer accepts every integer count from zero through MAX_DITHER_PINS; larger collections remain editable but rendering explicitly rejects the complete operation.",
      },
      entries: Array.from({ length: MAX_DITHER_PINS + 1 }, (_, value) => ({ value, appliedValue: value })),
      observe: (value) => value,
    }),
  },
};

const performanceFoundation = defineToolcraftPerformance({
  fixtureAdapters,
  rendererPipeline: appRendererPipelineRegistration,
  rendererStrategy: "canvas-2d",
  rendererTechnique: {
    exportRenderer: "canvas-2d",
    fidelityRisks: [
      "Preview and export must apply identical cover/crop, seeded grain, threshold, and timeline evaluation.",
      "Editor-only pin handles must never enter image or video artifacts.",
    ],
    intentionalRasterizationReason:
      "The requested result is a pixel-native dither field derived from uploaded raster media.",
    layers: [
      {
        content: ["bitmap-media", "dense-pattern", "noise", "composite"],
        exportMode: "included",
        id: "dither-output",
        intentionalRasterizationReason:
          "Dither cells and animated luminance fields are authored as raster pixels.",
        kind: "product-foreground",
        primitiveCount: "high",
        renderer: "canvas-2d",
        uiSelector: 'canvas[data-dither-output=""]',
      },
      {
        content: ["handles"],
        exportMode: "excluded",
        id: "pin-handles",
        kind: "editing-handles",
        primitiveCount: "low",
        renderer: "dom",
        uiSelector: '[data-testid="dither-pin-handle"]',
      },
    ],
    performanceRisks: [
      "Minimum pixel size and Resolution scale 2 maximize interactive sample count.",
      "Large source and export frames multiply tone, dither, and composite work.",
      "Timeline, pointer, and pin updates must reuse source-bound static caches.",
      "Resource guards reject unsupported source, backing, export, or pin workloads without silently reducing fidelity; these are support boundaries, not measured performance guarantees.",
    ],
    previewRenderer: "canvas-2d",
    productRepresentation: "pixel",
    rendererStrategy: "canvas-2d",
    sourceRepresentation: "image-media",
    whyNotAlternativeStrategies: [
      "DOM or SVG would create excessive nodes and would not preserve raster dither semantics.",
      "Canvas 2D is the functional baseline; the assessment's pending Canvas 2D/WebGL kernel comparison is deferred and no performance superiority is claimed.",
    ],
  },
  scenarios: [],
  usesCustomRenderer: true,
  workloadEnvelope,
} satisfies ToolcraftEnvelopePerformanceConfig);

export const appPerformanceAssessment = assessToolcraftRenderPlan(
  appSchema,
  performanceFoundation,
);

export const appPerformancePaths = deriveToolcraftPerformancePaths(
  appSchema,
  performanceFoundation,
);

function scenarioForPath(
  path: (typeof appPerformancePaths)[number],
): ToolcraftPerformanceScenario {
  const common = {
    automated: true,
    automatedTestName: `perf structure: ${path.id}`,
    browser: true,
    browserTestName: `browser perf: dither ${path.id}`,
    coversTargets: path.targets,
    expectedObservable: `The ${path.interaction} path updates the dither product without invalidating unrelated retained work.`,
    fixture: "reachable dither workload fixture",
    id: `dither-${path.id}`,
    pathId: path.id,
    ...(path.targets.length === 1 ? { target: path.targets[0] } : {}),
  };
  if (path.interaction === "export") {
    return {
      ...common,
      actionValue: "export.png",
      completionEvidence: "download",
      controlLabel: "Export PNG",
      interaction: "export",
    };
  }
  return {
    ...common,
    interaction: path.interaction,
    uiSelector: '[data-dither-output=""]',
  };
}

export const appPerformance = defineToolcraftPerformance({
  ...performanceFoundation,
  scenarios: appPerformancePaths.map(scenarioForPath),
});

export const appPerformanceFixturePlans = appPerformancePaths
  .filter(({ workloadDimensions }) => workloadDimensions.length > 0)
  .map((path) => compileToolcraftPerformanceFixturePlan(appPerformance, path));
