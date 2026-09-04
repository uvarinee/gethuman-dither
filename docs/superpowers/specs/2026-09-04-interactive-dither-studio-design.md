# Interactive Dither Studio — Design Specification

## Product goal

Build a desktop-first local web editor that lets a designer turn a JPG or PNG into an interactive dithered Canvas scene, tune its motion and interaction without code, and hand the result to a developer as deterministic scene data.

The visual direction combines a precise monochrome utility interface with the atmospheric Human.md hero reference: black background, fine white particle detail, restrained orange accents, monospace controls, and clear technical hierarchy. The product must not copy the Tooooools interface or implementation.

## First-release scope

The first release accepts JPG and PNG sources. It exports exactly three formats: PNG, MP4, and versioned JSON. MP4 source import is deferred until the image pipeline is stable.

Required capabilities:

- drag-and-drop and file-picker image loading;
- crop/fit and Canvas sizing;
- blur, grain, gamma, black point, and white point preprocessing;
- Floyd–Steinberg, Bayer 8×8, and seeded random dithering;
- pixel size, threshold, monochrome foreground/background, and invert controls;
- real-time Canvas preview;
- configurable shimmer and breathing motion;
- cursor-driven highlight interaction on desktop;
- multiple normalized-coordinate pins with single or double pulse;
- visual pin placement and exact percentage inputs;
- desktop and mobile preview modes;
- undo/redo and reset-to-default controls;
- import/export round-trip for `scene.json`;
- PNG still export and MP4 loop export;
- reduced-motion static rendering and automatic pause outside the viewport;
- local-only processing with no media upload.

Accounts, cloud storage, collaboration, video input, keyframe timelines, object tracking, painted masks, WebGL, AI generation, and standalone source-code export are out of scope.

## Implementation approach

Use the generated Toolcraft React/TypeScript application and preserve its signed host boundary. The Toolcraft runtime owns app chrome, panels, built-in controls, history, workspace persistence, settings JSON transfer, media storage, timeline transport, finite/infinite canvas behavior, and PNG/MP4 delivery.

Product code is limited to the supported composition surface:

- `app-schema.ts` declares all product values with built-in Toolcraft controls;
- a focused Canvas 2D renderer supplies product pixels through `canvasContent`;
- `sceneBoundsProvider` declares the canonical product frame;
- one deterministic `exportRenderer` draws the same scene for runtime-owned PNG and MP4 output;
- renderer math and cached image-processing helpers remain product-owned focused modules;
- `app-acceptance-data.ts` and `app-performance.ts` describe product observables and the renderer workload.

Canvas 2D is the rendering backend for the MVP. WebGL is considered only if a separately authorized performance investigation proves it necessary.

## Interface design

The signed Toolcraft workspace provides the toolbar, controls panel, Canvas shell, timeline, history, persistence, Setup, settings transfer, media upload, and sticky export actions. Product code does not recreate those surfaces.

The controls panel groups editable entities as Background, Source, Tone, Dither, Motion, Pointer, Pins, Image Export, and Video Export. Toolcraft's built-in sliders provide editable numeric values, built-in colors accept six-digit HEX, `fileDrop` owns JPG/PNG import, and `collectionActions` owns pin cardinality and exact values. Direct pin placement/dragging is a complementary Canvas interaction; exact normalized position remains a panel `vector` field.

Before a source is attached, the Canvas remains neutral without fake artwork or upload CTA. Runtime-owned media feedback explains invalid formats, unavailable resources, and persistence recovery.

## Scene data contract

The source of truth is a versioned JSON document containing:

- schema version and scene metadata;
- source reference and intrinsic dimensions;
- canvas, crop, palette, and preprocessing configuration;
- dither algorithm, threshold, pixel size, and deterministic seeds;
- shimmer and breathing configuration;
- pointer field configuration;
- an array of independently colored, normalized-coordinate pins and pulse settings;
- responsive overrides;
- performance, accessibility, and export settings.

Binary image data is not embedded in the JSON. On import, the editor requests a missing local source and reports dimension/name mismatches clearly. Validation clamps safe numeric ranges, rejects structural errors, and migrates supported older schema versions. JSON export followed by import with the same source must reproduce the same static frame.

## Rendering and data flow

The pipeline is:

`local image → decode → crop/resize → preprocess → intensity map → selected dither → particle field → ambient motion → pointer field → pin fields → Canvas frame`

Decode, preprocessing, and base-particle generation rerun only when their dependencies change. Animation frames apply only dynamic layers. Seeded pseudo-random generation keeps grain and random dithering repeatable. Pins use normalized scene coordinates, so their position survives resize and preview-mode changes.

The exported runtime mounts this same pipeline. Product copy, buttons, and bubbles remain ordinary HTML above the Canvas for crisp text, responsive behavior, localization, and accessibility.

## Export behavior

- Toolcraft Image Export produces PNG at the selected runtime resolution.
- Toolcraft Video Export produces MP4 from the top timeline at a fixed 30 FPS schedule and the selected duration.
- Toolcraft Export Settings produces the versioned portable JSON configuration; Import Settings restores it.

Product code supplies only a deterministic scene-coordinate frame callback. Toolcraft owns sizing, encoding, download, progress, cancellation, typed errors, and cleanup. A failed or cancelled export leaves the current project unchanged.

## State, lifecycle, and recovery

Editor settings live in the Toolcraft runtime schema and command bus. Runtime history owns undo/redo. Default local workspace persistence restores values, canvas, panels, timeline, and runtime media references; image bytes remain in Toolcraft's local IndexedDB repository and never enter settings JSON or product code.

Rendering pauses when the document is hidden or the scene leaves the viewport. Device pixel ratio is capped. Reduced-motion mode shows a representative static peak frame without shimmer, breathing, pointer animation, or pulse progression.

## Quality strategy

Automated tests cover seeded determinism, preprocessing utilities, all three dither algorithms, coordinate conversion, renderer invalidation, and schema-to-output mapping. Toolcraft acceptance covers built-in controls, history, persistence, settings transfer, timeline, upload, direct pin interaction, render scale, PNG, and MP4 artifacts.

Visual QA compares the supplied static references at desktop and narrow viewport sizes, checking subject readability, dot density, edges, midtones, crop, orange pin placement, and overall contrast. First delivery uses Toolcraft Tier 4 functional verification through one `npm run verify:delivery`; it does not claim measured performance. The implementation must still cap playback at 30 FPS, yield during viewport interaction, and avoid decoding the source on every frame.

## Acceptance criteria

The release is ready when a designer can load the Human.md image, reproduce the approved monochrome dither character, compare Floyd–Steinberg and Bayer, tune calm shimmer and breathing, place a double-pulse orange pin on the sphere, verify pointer response, switch preview sizes without pin drift, export PNG/MP4/JSON, re-import JSON without parameter loss, and use the same scene in the provided React runtime. The app must build successfully and remain keyboard-accessible with understandable recovery paths for unsupported files, invalid JSON, missing sources, and unavailable MP4 encoding.
