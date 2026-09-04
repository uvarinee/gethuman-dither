# Interactive Dither Studio Worklog

## Status

Mode: product

Schema, raster rendering, pin interaction and runtime export composition are integrated. Focused functional acceptance and production build pass. First delivery is blocked by a Windows path-separator assertion in the signed framework test; no initial receipt or measured performance result is claimed.

## Decision Trail

### Iteration 1 — First Interactive Dither Studio delivery

- Request: Create the approved interactive dithering app with `npx @pixel-point/toolcraft create`; deliver PNG, MP4 and settings JSON from the supplied context.
- Task type: First generated-product assembly, renderer, media, controls, timeline, exports and functional acceptance.
- User-visible result: Toolcraft image studio with tone preprocessing, three dither algorithms, colored shimmer, breathing, pointer response and pins. Signed Toolcraft owns the inspector, toolbar, upload, timeline, history, persistence and artifact actions.
- Source/reference checked: Approved design/spec and plan; `references/tooooools-settings-reference.png`, `references/human-hero-target.png`; generated schema/runtime and public browser proof helpers. Static references inform the effect, not a replacement editor shell.
- Reference inputs: `referenceInputs: []`; both supplied PNGs are static and no motion-reference preprocessing applies.
- Docs/contracts read: `workflow.md`; core runtime-boundary, control-selection, layout, performance, timeline-animation, setup-export and media-upload; assembly-workflow, schema-reference, component-rules, decision-contract, renderer-technique, acceptance-testing and performance. Local brainstorming/writing-plans/browser/systematic-debugging skills apply to their respective phases.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `infinity-canvas-scene-bounds`, `interaction-surface-ownership`, `controls-product-coverage`, `controls-section-inventory-required`, `timeline-mode-choice`, `timeline-enabled-behavior`, `output-export-required`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, `workflow-required`.
- View interaction intent: `non-spatial`; a two-dimensional raster with no 3D model, camera or orientation targets.
- Interaction ownership: Canvas owns direct pin dragging; panel owns precise normalized coordinates and non-spatial configuration. Runtime owns image transforms, viewport and transport. Pointer position is transient interaction state, not a panel-authored vector.
- Decision: Preserve the signed host. Use cached source/tone/dither passes, evaluated dynamic output, one bounds provider and one shared export callback. Keep empty uploads neutral. Explicit product guards report unsupported resource workloads without silent quality reduction.
- Alternatives rejected: Copying reference UI; editing signed runtime/bootstrap; fake default artwork; separate product storage/encoder/downloads; hidden quality clamps; layer controls for a single-source workflow; a second animation clock.
- State/output mapping: `source.image` uses runtime media/transform; `tone.*` preprocesses luminance; `dither.*` samples and quantizes; `motion.*`, timeline, pointer and `pins.items` shape cell colors/scales. Runtime background rules govern live/Infinity/artifact composition. Runtime Settings Transfer supplies JSON without embedding source image bytes.
- Integration finding: Real pointer leave/decay testing exposed duplicate animation scheduling inside a React state updater under StrictMode. Scheduling now has one transient ref authority outside the pure updater; fast decay returns to idle while slow decay remains visible through real animation frames.
- Performance intent: ordinary-product-work
- Verification: npm run verify:delivery
- Functional scope: First delivery means functional proof only, no measured performance or full audit. The first-delivery classification is recorded in the approved implementation plan. Focused unit and Playwright scenarios have passed; protected reporters/receipts own final results.
- Risks: Functional acceptance is incomplete; desktop host geometry and embedded browser availability have concrete limitations below. Deferred renderer comparisons are not performance certification.

## Decisions

### Renderer

- Decision: Intentionally rasterized Canvas 2D, cached source/tone/dither stages and evaluated dynamic presentation.
- Reason: The requested output is a pixel field over source images with deterministic preview/export semantics.
- Evidence: `src/dither`, canonical `app-performance.ts` pipeline, algorithm/integration tests and real output acceptance.

### View Interaction

- Decision: Non-spatial, no orientation targets.
- Reason: A two-dimensional editor rather than a 3D scene.
- Evidence: Typed readiness. Orbit and fixed-camera alternatives do not apply.

### Interaction Ownership

- Decision: Canvas pin dragging, panel precise values/configuration, runtime viewport/media commands.
- Reason: Each operation has one primary surface with complementary accessible entry.
- Evidence: `pin-position-drag` and `pin-position-entry` inventories, shared values and canvas-handle proof.

### Timeline

- Decision: Runtime playback, default 7.2-second seamless forward cycle.
- Reason: Authored animation and requested MP4 need one transport and fixed export schedule.
- Evidence: Schema/animation intent and shared loop progress. Drift profile redistributes velocity within one cycle; timeline duration controls overall speed.

### Layers

- Decision: Disabled.
- Reason: One source with pins does not require layer grouping/visibility/reorder.
- Evidence: Schema omits Layers intentionally.

### Controls

- Decision: Built-in Source, Tone, Dither, Motion, Pointer, Pins and delivery sections with explicit applicability.
- Reason: Canonical controls own reset/history/transfer; conditional branches hide unavailable parameters.
- Evidence: Section inventory and scalar/compound/case-scoped pixel tests. Pointer tuning uses keyboard controls with a stationary canvas pointer because moving to the panel intentionally leaves the transient field.

### Export

- Decision: Runtime PNG/JPG, MP4/WebM and Settings Transfer JSON; no SVG.
- Reason: User requested PNG, MP4, JSON; JPG/WebM remain mandatory Toolcraft baseline options.
- Evidence: Typed intent/settings/actions, shared export callback, decoded artifact recipes and JSON roundtrip tests. Runtime owns progress, encoding and download.

### Performance

- Decision: Functional first delivery without measurements.
- Reason: No performance complaint or audit authority exists.
- Evidence: Structural assessment passes; runtime deferred validation keeps benchmark requirements explicit.
- Workload: Source/preview/export pixels, blur, sampling and pins are bounded by schema/runtime and explicit product guards.
- Lifecycle: Retained decoded sources, cached static stages and dynamic work coalescing during viewport/visibility states without changing playback intent.
- Assessment: Dynamic/presentation Canvas2D-versus-WebGL comparisons remain deferred, not measured.
- Paths: Canonically derived by `deriveToolcraftPerformancePaths`; fixtures do not invent budgets.

## Evidence

- Source reviewed: The approved `docs/superpowers/specs/2026-09-04-interactive-dither-studio-design.md` and implementation plan against `references/tooooools-settings-reference.png` and `references/human-hero-target.png`.
- Reviewed `src/app/app-composition.tsx`, `src/app/app-schema.ts`, `src/app/app-performance.ts` and `src/dither/DitherCanvas.tsx` for the `runtime-shell-required`, `canvas-no-app-ui`, `infinity-canvas-scene-bounds` and `output-export-required` boundaries.
- Focused product tests cover rendered controls, pointer decay, independent pin editing, timeline continuity, exact render backing, real decoded PNG/JPG/MP4/WebM artifacts, JSON roundtrip and five-slice reload. The protected first-delivery gate remains the final result authority.

## Verification

Verification classification: Fresh generated-product completion; the numbered classification is recorded in the implementation plan.
Reason: First generated app with custom raster output, media, timeline and exports.
Run: Focused product unit/browser tests during integration; one bare `npm run verify:delivery` after required functional proof is ready.
Skip: Kernel benchmarks, measured performance and full audit; ordinary creation is not measurement authority.

Protected receipts own changed files, executed checks, measurements and results. Diagnostic screenshots do not mint protected evidence.

Later edits use only focused checks for changed behavior. A localized performance complaint requires exact request authority before measured targeted performance work; this build has no such authority. A full audit through `npm run verify:perf` requires a separate explicit request and was not run.

## Risks

- Risk: First delivery is incomplete until the initial receipt exists. The signed `src/app/app-acceptance.framework-boundary.test.ts:262` compares TypeScript's normalized forward-slash module path with Windows `path.join` backslashes using strict equality. This platform assertion fails independently of product behavior and requires an upstream Toolcraft correction/regeneration or a supported non-Windows verification environment; the signed file remains unchanged.
- Risk: Host-embedded browser failed before startup with Windows sandbox `helper_unknown_error: apply deny-read ACLs`; no other embedded controller was callable. Escalated headless Playwright is available for real automated proof/screenshots, not claimed as interactive embedded inspection.
- Risk: Signed Toolcraft host minimum width is 1024px; at 390px the inspector is offscreen. This desktop-editor limitation requires upstream runtime work, not a product CSS override. Output dimensions remain independently editable.
- Risk: Product guards report unsupported resource sizes/workloads rather than silently reducing quality. Large-source/artifact acceptance must match those guards and cannot promise unverified support.
