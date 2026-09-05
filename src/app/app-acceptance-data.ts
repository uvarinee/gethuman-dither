import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";
import { appSchema } from "./app-schema";

const persistenceSlices =
  appSchema.persistence.storage === "localStorage"
    ? appSchema.persistence.include
    : [];

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    loopDuration: {
      evidence:
        "A 7.2-second cycle keeps flicker drift and the integer-count pin flashes seamless without reversing direction.",
      seconds: 7.2,
      source: "product-derived",
    },
    mode: "timeline-playback",
  },
  mode: "new-toolcraft-app",
  referenceInputs: [],
};

export const appProductReadiness: ToolcraftProductReadiness = {
  exportIntent: {
    image: {
      evidence: "The user explicitly requested PNG delivery.",
      mode: "user-requested",
    },
    svg: { mode: "not-requested" },
    video: {
      evidence: "The user explicitly requested MP4 delivery.",
      mode: "user-requested",
    },
  },
  interactionOwnership: [
    {
      alternative: {
        reason:
          "A panel drag pad would duplicate the same spatial gesture away from the image.",
        surface: "panel",
      },
      capability: "direct-spatial-edit",
      evidence: {
        detail:
          "Direct manipulation keeps each pin attached to its visible image position.",
        source: "usability-analysis",
      },
      id: "pin-position-drag",
      reason:
        "The canvas owns pin dragging because position is easiest to understand against the rendered output.",
      surface: "canvas",
      target: "pins.items",
    },
    {
      alternative: {
        reason:
          "A canvas-only gesture cannot provide keyboard-accessible exact normalized coordinates.",
        surface: "canvas",
      },
      capability: "precise-value-entry",
      evidence: {
        detail:
          "The built-in Vector field provides exact, resettable position entry for each pin record.",
        source: "usability-analysis",
      },
      id: "pin-position-entry",
      reason:
        "The panel owns exact pin coordinates while leaving direct spatial movement to the canvas.",
      selectionScope: { mode: "global" },
      surface: "panel",
      target: "pins.items",
    },
  ],
  mode: "product",
  productName: "Interactive Dither Studio",
  productSummary:
    "A desktop image studio for monochrome dithering, animated highlights, pointer fields, and pulsing pins.",
  requestedBehavior:
    "Import JPG or PNG images, tune tone and dithering, animate flicker and pins, interact with the canvas, and export PNG, MP4, or portable settings JSON.",
  viewInteraction: {
    mode: "non-spatial",
    reason: "The product edits a two-dimensional raster image without a 3D camera or model.",
  },
};

const browser = (testName: string) => ({
  budget: "standard" as const,
  file: "e2e/product-dither.spec.ts" as const,
  testName,
});

function controlAcceptance(
  id: string,
  target: string,
  componentType: string,
  label: string,
  extra: Partial<ToolcraftComponentAcceptance> = {},
): ToolcraftComponentAcceptance {
  return {
    automated: true,
    automatedTestName: `${label} changes dither output`,
    browser: { ...browser(`browser: ${label} changes dither output`),
      ...(id.startsWith("motion.") ? { file: "e2e/product-dither-motion.spec.ts" } : {}),
      ...(id === "dither.ink" ? { file: "e2e/product-dither-ink.spec.ts" } : {}),
      ...(id.startsWith("tone.") ? { file: "e2e/product-tone.spec.ts" } : {}),
      ...(id.startsWith("source.") ? { file: "e2e/product-source.spec.ts" } : {}),
      ...(id.startsWith("pointer.") ? { file: "e2e/product-dither-pointer.spec.ts" } : {}) },
    componentType,
    evidence: "rendered-pixels",
    expectedObservable: `${label} changes the committed dither frame or its runtime-owned delivery setting.`,
    fixture: "uploaded two-tone source image",
    id,
    kind: "control",
    target,
    userAction: `Change ${label} and inspect the committed product output.`,
    ...extra,
  };
}

const controlRows: ToolcraftComponentAcceptance[] = [
  controlAcceptance("background.include", "export.includeBackground", "switch", "Background", {
    browser: { ...browser("browser: Background changes dither output"), file: "e2e/product-dither-background.spec.ts" },
    backgroundOutputCoverage: [
      "preview-hidden-when-excluded",
      "image-transparent-when-excluded",
      "infinity-viewport-color-and-dependency",
      "video-background-preserved",
    ],
  }),
  controlAcceptance("background.color", "appearance.background", "color", "Background color", {
    browser: { ...browser("browser: Background color changes dither output"), file: "e2e/product-dither-background.spec.ts" },
  }),
  controlAcceptance("source.image", "source.image", "fileDrop", "Source image", {
    evidence: "media-lifecycle",
    mediaLifecycleCoverage: ["upload", "remove", "rotate", "flip", "transform-output", "reset"],
  }),
  controlAcceptance("tone.blur", "tone.blur", "slider", "Blur"),
  controlAcceptance("tone.grain", "tone.grain", "slider", "Grain"),
  controlAcceptance("tone.gamma", "tone.gamma", "slider", "Gamma"),
  controlAcceptance("tone.black-point", "tone.blackPoint", "slider", "Black point"),
  controlAcceptance("tone.white-point", "tone.whitePoint", "slider", "White point"),
  controlAcceptance("dither.algorithm", "dither.algorithm", "segmented", "Algorithm", {
    optionCoverage: ["floyd-steinberg", "bayer", "random"],
  }),
  controlAcceptance("dither.pixel-size", "dither.pixelSize", "slider", "Pixel size"),
  controlAcceptance("dither.threshold", "dither.threshold", "slider", "Threshold"),
  controlAcceptance("dither.invert", "dither.invert", "switch", "Invert"),
  controlAcceptance("dither.ink", "dither.ink", "color", "Particle color"),
  controlAcceptance("motion.flicker", "motion.flicker.enabled", "switch", "Flicker"),
  controlAcceptance("motion.flicker-amount", "motion.flicker.amount", "slider", "Flicker amount"),
  controlAcceptance("motion.flicker-speed", "motion.flicker.speed", "slider", "Flicker speed", {
    expectedObservable: "Speed changes independent opacity fade frequency while preserving the seamless timeline loop.",
  }),
  controlAcceptance("motion.breathing", "motion.breathing.enabled", "switch", "Breathing"),
  controlAcceptance("motion.breathing-amount", "motion.breathing.amount", "slider", "Breathing amount"),
  controlAcceptance("pointer.enabled", "pointer.enabled", "switch", "Pointer response"),
  controlAcceptance("pointer.radius", "pointer.radius", "slider", "Pointer radius"),
  controlAcceptance("pointer.repelRadius", "pointer.repelRadius", "slider", "Pointer repel radius"),
  controlAcceptance("pointer.repelForce", "pointer.repelForce", "slider", "Pointer repel force"),
  controlAcceptance("pointer.attractForce", "pointer.attractForce", "slider", "Pointer attract force"),
  controlAcceptance("pointer.return", "pointer.return", "slider", "Pointer return"),
  controlAcceptance("pointer.damping", "pointer.damping", "slider", "Pointer inertia"),
  controlAcceptance("pins.items", "pins.items", "collectionActions", "Pins", {
    browser: { ...browser("browser: Pins changes dither output"), file: "e2e/product-dither-pin-paint.spec.ts" },
    expectedObservable: "Each pin switches existing cells to full color within a hard radius, with an outward branching fill, hold and clear cycle; gaps and uncolored cells retain their original appearance.",
    controlPartCoverage: [
      "collectionActions.add",
      "collectionActions.remove",
      "collectionActions.items",
    ],
    interactionId: "pin-position-entry",
  }),
  controlAcceptance("image.format", "export.image.format", "select", "Image format", {
    browser: { budget: "extended-io", file: "e2e/product-dither-image.spec.ts", testName: "browser: image format resolves real artifact settings" },
    evidence: "exported-bytes",
    optionCoverage: ["png", "jpg"],
  }),
  controlAcceptance("image.resolution", "export.image.resolution", "select", "Image resolution", {
    browser: { budget: "extended-io", file: "e2e/product-dither-image.spec.ts", testName: "browser: image resolution resolves real artifact settings" },
    evidence: "exported-bytes",
    optionCoverage: ["2k", "4k", "8k"],
  }),
  controlAcceptance("video.format", "export.video.format", "select", "Video format", {
    browser: { budget: "extended-io", file: "e2e/product-dither-video.spec.ts", testName: "browser: video format resolves real artifact settings" },
    evidence: "exported-bytes",
    optionCoverage: ["mp4", "webm"],
  }),
  controlAcceptance("video.resolution", "export.video.resolution", "select", "Video resolution", {
    browser: { budget: "extended-io", file: "e2e/product-dither-video.spec.ts", testName: "browser: video resolution resolves real artifact settings" },
    evidence: "exported-bytes",
    optionCoverage: ["current", "4k"],
  }),
];

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  ...controlRows,
  {
    automated: true,
    automatedTestName: "restores dither workspace after reload",
    browser: {
      budget: "extended-io",
      file: "e2e/product-dither-persistence.spec.ts",
      testName: "browser: dither workspace restores canvas values panels timeline and media",
    },
    componentType: "persistence",
    evidence: "persistence-state",
    expectedObservable:
      "Canvas, media, controls, timeline, and panel workspace restore after a real reload.",
    fixture: "persisted dither workspace",
    id: "persistence.reload",
    kind: "runtime",
    persistenceCoverage: "reload",
    persistenceSlices,
    target: "canvas.size.width",
    userAction: "Change the workspace, wait for persistence, and reload.",
  },
  {
    automated: true,
    automatedTestName: "keeps selected raster backing in every required state",
    browser: { ...browser("browser: dither canvas preserves selected backing pixels"), file: "e2e/product-renderer.spec.ts" },
    componentType: "canvas",
    evidence: "rendered-pixels",
    expectedObservable:
      "Canvas backing equals CSS size times device pixel ratio times selected render scale during interaction, playback, and steady state.",
    fixture: "render scale 2 dither canvas",
    id: "renderer.render-scale",
    kind: "runtime",
    renderScaleCoverage: {
      kind: "selected-backing-pixels",
      states: ["interaction", "playback", "steady"],
    },
    target: "canvas.renderScale",
    userAction: "Select render scale 2 and inspect backing pixels in every state.",
  },
  {
    automated: true,
    automatedTestName: "plays a seamless forward dither loop",
    browser: { ...browser("browser: dither timeline is seamless and forward-only"), file: "e2e/product-dither-timeline.spec.ts" },
    componentType: "timeline",
    evidence: "timeline-output",
    expectedObservable:
      "Play, pause, scrub, duration edit, and loop keep a seamless forward-only animated dither frame.",
    fixture: "7.2-second animated dither loop",
    id: "timeline.playback",
    kind: "runtime",
    timelineCoverage: "playback",
    timelineLoopProof: {
      direction: "forward-only",
      durationChange: "reproved-after-edit",
      reversePlayback: "forbidden",
      seam: "first-last-match",
    },
    timelinePlaybackCoverage: "all-playback-behavior",
    userAction: "Play, pause, scrub, edit duration, and cross the loop seam.",
  },
  {
    automated: true,
    automatedTestName: "drags a pin directly over the image",
    browser: { ...browser("browser: canvas pin drag updates its normalized position"), file: "e2e/product-dither-pins.spec.ts" },
    canvasHandle: {
      outputObservable: "The pin highlight moves with the textless canvas handle.",
      testId: "dither-pin-handle",
      writesTarget: "pins.items",
    },
    componentType: "canvas handle",
    evidence: "rendered-pixels",
    expectedObservable: "Dragging a pin updates its runtime position and rendered highlight.",
    fixture: "one visible pin",
    id: "pins.drag",
    interactionId: "pin-position-drag",
    kind: "canvas-handle",
    target: "pins.items",
    userAction: "Drag the pin handle across the image.",
  },
  {
    actionCoverage: ["export.png", "export.video"],
    automated: true,
    automatedTestName: "draws dither product into the supplied export context without editor overlays",
    browser: { budget: "extended-io", file: "e2e/product-dither-export.spec.ts", testName: "browser: PNG export contains deterministic dither pixels" },
    componentType: "panelActions",
    evidence: "exported-bytes",
    exportArtifactCoverage: "all-required-image-export-behavior",
    expectedObservable: "PNG export has the selected dimensions, alpha behavior, and dither pixels.",
    fixture: "finite and Infinity image export",
    id: "export.image",
    kind: "control",
    target: "actions.output",
    userAction: "Export PNG and inspect decoded bytes.",
  },
  {
    actionCoverage: ["export.png", "export.video"],
    automated: true,
    automatedTestName: "maps the canonical video schedule to changing deterministic product frames",
    browser: { budget: "extended-io", file: "e2e/product-dither-export.spec.ts", testName: "browser: MP4 export contains changing dither frames" },
    componentType: "panelActions",
    evidence: "exported-bytes",
    exportArtifactCoverage: "all-required-video-export-behavior",
    expectedObservable:
      "MP4 export has exact duration, 30 FPS packet cadence, selected dimensions, and changing frames.",
    fixture: "7.2-second MP4 export",
    id: "export.video",
    kind: "control",
    target: "actions.output",
    userAction: "Export MP4 and inspect decoded frames and packet timestamps.",
  },
  {
    automated: true,
    automatedTestName: "preserves scene continuity in Infinity mode",
    browser: { ...browser("browser: Infinity mode preserves dither scene and backing"), file: "e2e/product-dither-canvas.spec.ts" },
    componentType: "canvas",
    evidence: "viewport-side-effect",
    expectedObservable:
      "Infinity toggling changes only the boundary while the scene, renderer, viewport, and backing remain stable.",
    fixture: "finite and Infinity dither scene",
    id: "canvas.infinity",
    infinityCanvasCoverage: "mode-continuity-and-restoration",
    kind: "runtime",
    target: "canvas.infinity",
    userAction: "Toggle Infinity on and off and inspect scene continuity.",
  },
  {
    automated: true,
    automatedTestName: "crops Infinity image export to product bounds",
    browser: { ...browser("browser: Infinity PNG uses dither scene bounds"), file: "e2e/product-dither-infinity-export.spec.ts", budget: "extended-io" },
    componentType: "canvas",
    evidence: "exported-bytes",
    expectedObservable: "Infinity PNG crops to visible product and media bounds.",
    fixture: "Infinity dither image export",
    id: "canvas.infinity-image-export",
    infinityCanvasCoverage: "scene-bounds-image-export",
    kind: "runtime",
    target: "canvas.infinity",
    userAction: "Enable Infinity and export PNG.",
  },
  {
    automated: true,
    automatedTestName: "keeps stable bounds across Infinity video frames",
    browser: { ...browser("browser: Infinity MP4 uses one stable scene envelope"), file: "e2e/product-dither-infinity-export.spec.ts", budget: "extended-io" },
    componentType: "canvas",
    evidence: "exported-bytes",
    expectedObservable: "Infinity MP4 uses one scene envelope for every scheduled frame.",
    fixture: "Infinity dither video export",
    id: "canvas.infinity-video-export",
    infinityCanvasCoverage: "scene-bounds-video-export",
    kind: "runtime",
    target: "canvas.infinity",
    userAction: "Enable Infinity and export MP4.",
  },
];

export const appControlSectionInventory = [
  {
    entity: "Output background",
    entityId: "output-background",
    finiteSelectors: [{ reason: "Background inclusion changes its own output state.", role: "parameter", target: "export.includeBackground" }],
    groupingReason: "Inclusion and color jointly define preview and exported background.",
    id: "background",
    targets: ["export.includeBackground", "appearance.background"],
    title: "Background",
  },
  {
    entity: "Source image",
    entityId: "source-image",
    finiteSelectors: [],
    groupingReason: "The runtime image uploader is the complete source-material surface.",
    id: "source",
    targets: ["source.image"],
    title: "Source",
  },
  {
    entity: "Tone mapping",
    entityId: "tone-mapping",
    finiteSelectors: [],
    groupingReason: "These controls jointly preprocess luminance before dithering.",
    id: "tone",
    targets: ["tone.blur", "tone.grain", "tone.gamma", "tone.blackPoint", "tone.whitePoint"],
    title: "Tone",
  },
  {
    entity: "Dither field",
    entityId: "dither-field",
    finiteSelectors: [
      { reason: "Algorithm chooses its own deterministic quantization rule.", role: "parameter", target: "dither.algorithm" },
      { reason: "Invert changes its own binary output mapping.", role: "parameter", target: "dither.invert" },
    ],
    groupingReason: "Algorithm, sampling, threshold, polarity, and ink jointly define the dither field.",
    id: "dither",
    targets: ["dither.algorithm", "dither.pixelSize", "dither.threshold", "dither.invert", "dither.ink"],
    title: "Dither",
  },
  {
    entity: "Dither motion",
    entityId: "dither-motion",
    finiteSelectors: [
      { affectedTargets: [], reason: "Flicker gates its variation and speed dependents.", role: "branch", target: "motion.flicker.enabled" },
      { affectedTargets: [], reason: "Breathing gates its amount dependent.", role: "branch", target: "motion.breathing.enabled" },
    ],
    groupingReason: "Flicker and breathing animate the same dither field through runtime timeline time.",
    id: "motion",
    targets: ["motion.flicker.enabled", "motion.flicker.amount", "motion.flicker.speed", "motion.breathing.enabled", "motion.breathing.amount"],
    title: "Motion",
  },
  {
    entity: "Pointer field",
    entityId: "pointer-field",
    finiteSelectors: [
      { affectedTargets: [], reason: "Response gates the six particle force and recovery controls.", role: "branch", target: "pointer.enabled" },
    ],
    groupingReason: "Availability, reveal strength and edge/size parameters define one grid-aligned cursor paint field.",
    id: "pointer",
    targets: ["pointer.enabled", "pointer.radius", "pointer.repelRadius", "pointer.repelForce", "pointer.attractForce", "pointer.return", "pointer.damping"],
    title: "Pointer",
  },
  {
    entity: "Interactive pins",
    entityId: "interactive-pins",
    finiteSelectors: [],
    groupingReason: "One growable compound collection owns pin position, color, hard radius, flash count, phase durations and branching.",
    id: "pins",
    targets: ["pins.items"],
    title: "Pins",
  },
  {
    entity: "Image delivery",
    entityId: "image-delivery",
    finiteSelectors: [
      { reason: "Format changes its own artifact encoding.", role: "parameter", target: "export.image.format" },
      { reason: "Resolution changes its own artifact size.", role: "parameter", target: "export.image.resolution" },
    ],
    groupingReason: "Format and resolution configure runtime-owned image delivery.",
    id: "image-export",
    targets: ["export.image.format", "export.image.resolution"],
    title: "Image Export",
  },
  {
    entity: "Video delivery",
    entityId: "video-delivery",
    finiteSelectors: [
      { reason: "Format changes its own artifact encoding.", role: "parameter", target: "export.video.format" },
      { reason: "Resolution changes its own artifact size.", role: "parameter", target: "export.video.resolution" },
    ],
    groupingReason: "Format and resolution configure runtime-owned video delivery.",
    id: "video-export",
    targets: ["export.video.format", "export.video.resolution"],
    title: "Video Export",
  },
] as const satisfies readonly ToolcraftControlSectionInventoryEntry[];
