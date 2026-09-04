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

Use the Toolcraft React/TypeScript application scaffold. Keep the first release in one application while enforcing package-like boundaries inside `src`:

- `scene-schema`: serializable types, defaults, validation, migration, and human-readable errors;
- `renderer-core`: deterministic image preprocessing, dithering, particle generation, dynamic fields, Canvas drawing, resize, and lifecycle;
- `editor`: file loading, control panels, history, presets, preview modes, pin editing, import/export, and local recovery;
- `react-runtime`: a small component that mounts the same renderer used by the editor and manages observers, reduced motion, fallback, and accessibility.

These boundaries allow later extraction into workspace packages without changing the scene contract. Canvas 2D is the rendering backend for the MVP. WebGL is considered only after profiling proves Canvas cannot sustain the target workload.

## Interface design

The app uses a full-height three-region workspace:

1. A narrow left rail contains branding, project actions, preview modes, import/export, and history.
2. A scrollable inspector contains collapsible groups for Source, Preprocess, Dither, Motion, Pointer, Pins, and Export.
3. A large dark stage shows the live scene, fit/zoom controls, performance state, and contextual empty/error states.

Controls combine an accessible range input with an editable numeric value. Hex fields accept standard six-digit values with `#`. Normalized pin coordinates are displayed as percentages. A pin can be selected in the inspector or placed and dragged directly on the scene. Mobile preview changes the scene viewport and disables pointer interaction by default; it does not turn the editor itself into a phone layout.

The empty state immediately explains supported input types and offers a drop target. Errors state what happened and the corrective action without exposing internal stack details.

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

- PNG exports the current composed frame at the selected scale.
- MP4 renders a deterministic loop at the configured dimensions, frame rate, and duration. The UI checks browser encoding support before work begins and gives an actionable compatibility error when MP4 encoding is unavailable.
- JSON exports the validated versioned scene configuration.

Export progress can be cancelled. A failed or cancelled export leaves the current project unchanged and releases temporary resources.

## State, lifecycle, and recovery

Editor settings are kept in a central scene state with bounded undo/redo history. The latest valid configuration is saved locally, while the original image remains local and may need to be selected again after reload. Replacing a source revokes stale object URLs and releases decoded resources.

Rendering pauses when the document is hidden or the scene leaves the viewport. Device pixel ratio is capped. Reduced-motion mode shows a representative static peak frame without shimmer, breathing, pointer animation, or pulse progression.

## Quality strategy

Automated tests cover schema validation/migration, seeded determinism, preprocessing utilities, all three dither algorithms, coordinate conversion, history behavior, and JSON round-trips. Component tests cover accessible labels, keyboard operations, empty/error states, and control-to-scene updates. Browser-level checks cover upload, preview, pin placement, responsive modes, and each export entry point.

Visual QA compares the supplied source/reference pair at desktop and mobile preview sizes, checking subject readability, dot density, edges, midtones, crop, orange pin placement, and overall contrast. The final build must sustain a 30 fps target on the agreed test device, stop work offscreen, and avoid decoding the source on every frame.

## Acceptance criteria

The release is ready when a designer can load the Human.md image, reproduce the approved monochrome dither character, compare Floyd–Steinberg and Bayer, tune calm shimmer and breathing, place a double-pulse orange pin on the sphere, verify pointer response, switch preview sizes without pin drift, export PNG/MP4/JSON, re-import JSON without parameter loss, and use the same scene in the provided React runtime. The app must build successfully and remain keyboard-accessible with understandable recovery paths for unsupported files, invalid JSON, missing sources, and unavailable MP4 encoding.
