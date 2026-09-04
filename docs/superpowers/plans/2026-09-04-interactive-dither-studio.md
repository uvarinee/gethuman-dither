# Interactive Dither Studio Toolcraft Implementation Plan

**Goal:** Build the approved local JPG/PNG dithering studio inside the signed Toolcraft shell, with interactive Canvas 2D output and runtime-owned PNG, MP4, and settings JSON delivery.

**Architecture:** Toolcraft owns app chrome, controls, history, persistence, media, timeline, canvas modes, and exports. Product code declares a built-in-control schema and supplies one cached Canvas 2D product renderer through `canvasContent`, a canonical `sceneBoundsProvider`, and one deterministic `exportRenderer` callback shared by PNG and MP4.

**Verification tier:** Tier 4 — first generated-product delivery. Run focused tests while developing, then exactly one bare `npm run verify:delivery`, followed by local browser inspection. Measured performance and `verify:perf` are not authorized.

## Product decisions

- Canvas: `editable-output`, default 1920×1080, render scale enabled.
- View interaction: `non-spatial`; this is a 2D image scene.
- Timeline: enabled playback timeline because motion and MP4 export are required; seamless forward loop, default 7.2 seconds.
- Layers: disabled; one source image and pin configuration do not require layer visibility/reorder workflow.
- Persistence: Toolcraft default local workspace slices, including media and timeline.
- JSON: runtime Export Settings / Import Settings; no product-owned JSON picker or serializer.
- Export intent: image `user-requested`, SVG `not-requested`, video `user-requested`.
- Renderer: Canvas 2D for preview and runtime-supplied export context; intentional rasterization matches the requested effect.
- Reference inputs: no motion reference, so `referenceInputs: []`; supplied PNGs are static visual QA references only.

## Control Section Inventory

- Background — `export.includeBackground`, `appearance.background`; runtime relocates both to Setup.
- Source — one image `fileDrop` at `source.image`; runtime owns upload, transforms, deletion, and durable media.
- Tone — blur, grain, gamma, black point, white point.
- Dither — algorithm, pixel size, threshold, invert, ink color.
- Motion — shimmer switch/color/amount/speed and breathing switch/amount.
- Pointer — enabled, radius, strength, decay.
- Pins — one `collectionActions` target with compound position/color/core/bloom/intensity/pulse fields.
- Image Export — required runtime format/resolution pair.
- Video Export — required runtime format/resolution pair.

Algorithm and pulse selectors are finite parameters. Motion and pointer switches are branches whose conditional dependents are absent when disabled. Pin position drag is Canvas-owned `direct-spatial-edit`; exact position is panel-owned `precise-value-entry`.

## Renderer plan

Reachable workload dimensions are source pixel area (external input, bounded by runtime image limits), output pixel area (runtime canvas/render scale), and particle density (inverse `dither.pixelSize`, schema minimum is maximum work). Static passes are source decode/sample, tone mapping, and dither/particle generation; dynamic passes are timeline motion, pointer/pin fields, and Canvas presentation. Static passes are retained per source/settings cache key. Timeline, pointer, pin movement, pan, and zoom must not decode or preprocess the image. The typed pipeline registration, workload envelope, invalidation map, `assessToolcraftRenderPlan`, derived paths, and fixture adapters must exist before renderer implementation.

### Task 1: Repair scaffold and record product contract

**Files:** `src/app/app-schema.ts`, `src/app/studio-shell.ts`, `docs/toolcraft/agent-worklog.md`, this spec/plan.

- [ ] Replace the two NUL-corrupted starter product files with valid Toolcraft product sources; do not edit signed bootstrap/runtime.
- [ ] Set worklog `Mode: product` and add a Decision Trail entry covering request, references, routes read, ownership, timeline, layers, renderer, exports, persistence, Tier 4 proof, and risks.
- [ ] Run `npm.cmd run ai:check`.
- [ ] Commit `chore: establish Toolcraft dither product contract`.

### Task 2: Author schema, readiness, and renderer assessment

**Files:** `src/app/app-schema.ts`, `src/app/app-acceptance-data.ts`, `src/app/app-performance.ts`, focused schema/performance tests.

- [ ] Write failing product tests for section inventory, defaults, applicability, export intent, timeline intent, persistence slices, interaction ownership, and performance structure.
- [ ] Declare the built-in controls listed above, all `defaultValue`, `applicability`, `performanceRole`, semantic grouping, and finite-selector roles.
- [ ] Declare product readiness, `animationIntent`, `referenceInputs: []`, acceptance rows, render-scale coverage, and persistence reload.
- [ ] Declare Canvas 2D renderer technique, workload envelope, pipeline passes, invalidation, adapters, derived paths, and run render-plan assessment until structurally valid.
- [ ] Run focused schema/performance tests and `npm.cmd run ai:check`.
- [ ] Commit `feat: define dither studio schema and renderer plan`.

### Task 3: Implement deterministic dither renderer

**Files:** `src/dither/dither-algorithms.ts`, `dither-algorithms.test.ts`, `dither-renderer.ts`, `DitherCanvas.tsx`, `DitherCanvas.module.css`.

- [ ] Write failing exact-output tests for seeded grain/random, Floyd–Steinberg, Bayer 8×8, preprocessing bounds, and input immutability.
- [ ] Implement source sampling as cover/crop, luminance, blur, grain, gamma, black/white mapping, and three dither modes.
- [ ] Implement retained cache stages and dynamic shimmer, breathing, pointer, and double-pulse pin fields using Toolcraft timeline time.
- [ ] Consume `useToolcraftProductSceneFrame`; preserve CSS × DPR × renderScale backing in interaction, playback, and steady states.
- [ ] Yield/coalesce nonessential playback work during Toolcraft viewport interaction and dispose image/RAF resources.
- [ ] Run focused algorithm/renderer tests.
- [ ] Commit `feat: render interactive dither scenes`.

### Task 4: Integrate canvas interaction and runtime exports

**Files:** `src/app/app-composition.tsx`, `src/dither/DitherCanvas.tsx`, focused interaction/export tests.

- [ ] Add textless Canvas pin handles that update the runtime pin target and reference the typed Canvas interaction owner.
- [ ] Keep panel Vector editing as precise entry, not a duplicate drag interaction.
- [ ] Provide stable finite/infinite product bounds through `sceneBoundsProvider`.
- [ ] Provide one deterministic `exportRenderer.renderFrame`; do not allocate canvases, encode, download, or import an encoder.
- [ ] Use the same evaluated timeline state for live output and runtime PNG/MP4 frames.
- [ ] Run focused interaction/export tests and build.
- [ ] Commit `feat: integrate dither canvas and exports`.

### Task 5: Acceptance and product verification

**Files:** `src/app/app-acceptance-data.ts`, product-owned Vitest files, `e2e/dither-studio.spec.ts`, `docs/toolcraft/agent-worklog.md`, `README.md`.

- [ ] Read `docs/toolcraft/acceptance-testing.md` and `docs/toolcraft/performance.md` Verification guidance before writing proof.
- [ ] Implement observable acceptance for every visible control/entity, upload, pin ownership, settings transfer, persistence reload, timeline loop, render scale, PNG, and MP4.
- [ ] Add browser proof for actual dither pixel change, algorithm branches, source removal, pin movement, pointer response, forward loop seam, export artifacts, and narrow layout.
- [ ] Update README and worklog with concrete decisions and remaining risks.
- [ ] Run focused Vitest and browser acceptance during development.
- [ ] Run exactly one `npm.cmd run verify:delivery`; do not run measured performance.
- [ ] Use the local Toolcraft browser skill and host-embedded browser for manual desktop/narrow visual QA with supplied references.
- [ ] Start `npm.cmd run dev`, leave the app usable, restore `.git`, and commit `feat: deliver interactive dither studio`.

