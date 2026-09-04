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

### Iteration 2 — Particle appearance and pointer refinement

- Request: Replace striped Shimmer with independent random particle disappearance/reappearance; expose particle color, fade speed/weight and local hover acceleration, raised surface, size and soft radius, changing nothing else.
- Task type: Bounded product renderer/control refinement; not performance work or upstream repair.
- Source/reference checked: `https://www.gethuman.md/sapien.html` render source and the user's static screenshot. The reference modulates luminance before Bayer thresholding; the user explicitly requests independent opacity noise instead.
- Reference inputs: Static screenshot and reference webpage source; no supplied motion media, `referenceInputs: []`.
- Docs/contracts read: workflow, core control-selection/layout/runtime-boundary/performance/timeline-animation; schema-reference, component-rules, renderer-technique, decision-contract, performance and acceptance-testing.
- Contract rules applied: runtime-shell-required, controls-product-coverage, controls-section-inventory-required, timeline-enabled-behavior, acceptance-product-observable, performance-coverage-levels.
- User-visible result: Particle color, independent opacity Flicker and a tunable soft hover lens replace the previous striped color shimmer.
- View interaction intent: Non-spatial, unchanged 2D scene.
- Decision: Preserve `dither.ink` as Particle color; replace removed shimmer targets with `motion.flicker.*`. Retain existing pins/breathing/source/timeline/export. Use seeded circular noise and a soft radial lens in the existing shared renderer; no new buffers, dependencies or source-cache invalidation.
- Interaction ownership: Transient hover stays canvas-owned; global field tuning stays in built-in panel controls. Non-spatial view remains unchanged.
- Alternatives rejected: Moving color bands, cursor brightening, image blur buffers, a new animation clock, renderer replacement and unrelated UI changes.
- State/output mapping: Flicker amount controls opacity depth, speed controls noise event frequency, pointer speed blends a faster local track, strength raises/displaces the surface, size changes dot size and softness shapes the radius edge. Pointer never adds color or brightness.
- Verification scope: Focused math, schema, renderer/export integration and exact affected browser acceptance only. No aggregate delivery/build, measured performance or audit. The old signed Windows gate failure remains outside this user request.
- Performance intent: ordinary-product-work
- Verification: npm run verify:delivery
- Browser capability: Embedded controller failed to start; reference source was read via HTTP and real browser proof uses headless Playwright.
- Focused result: 44 targeted unit tests passed. All eleven changed control scenarios and the runtime timeline scenario passed; the color scenario was rerun alone after a cold-navigation interruption. A separate small PNG/MP4 test passed with breathing/pins disabled, proving colored particles and independently changing fade frames with thirty encoded packets. Screenshot inspected. No aggregate gate or measured performance was run.
- Risks: Previous shimmer settings are intentionally retired rather than reinterpreted as flicker. Other runtime targets/media references are preserved. This is a functional refinement, not full-delivery certification.

### Iteration 3 — Pointer reveal and Point cell paint

- Request: Implement both approved changes: hover like the supplied light-cell patch and Point color applied directly to particles, with a soft edge rather than an overlaid glow.
- Task type: Later focused renderer/control refinement in branch feat/pointer-hover; ordinary product work.
- User-visible result: Pointer reveals additional source-weighted cells with an organic contour, fixed centers and soft decay. Point colors cells with a smooth radial falloff and does not enlarge particles or paint grid gaps. Bulge is now Strength; Bloom is now Blur.
- Source/reference checked: The two user screenshots (codex-clipboard-8dd9c2e1-afb6-4dac-814e-0f80e07da68e.png and codex-clipboard-689324eb-5e51-4649-adae-ea095d8d3101.png), https://shaders.evilrabbit.com/#dither, current renderer, scene settings, schema and product proof helpers. This is an explicit redesign of existing effects, not a complete reference-runtime port.
- Reference inputs: Two static PNGs and a webpage; no supplied video/GIF/sequence. referenceInputs remains [] and no motion preprocessing applies.
- Docs/contracts read: workflow; core reference-study, runtime-boundary, control-selection, layout, performance; assembly-workflow, schema-reference, component-rules, decision-contract, renderer-technique, performance and acceptance-testing. Applied brainstorming, writing-plans, browser and systematic-debugging workflows.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, canvas-surface-preserved, interaction-surface-ownership, controls-product-coverage, controls-section-inventory-required, acceptance-product-observable, performance-coverage-levels, workflow-required.
- View interaction intent: non-spatial; unchanged two-dimensional raster and no orientation targets.
- Interaction ownership: Canvas owns transient hover and direct Point dragging. Panel owns built-in parameter, exact-position and collection edits. Existing target/value shapes remain compatible with runtime persistence, reset and settings transfer.
- Decision: Use deterministic scalar per-cell math in the existing shared Canvas 2D renderer. Source tone gates additional hover cells, including inverted sources; a fixed grid threshold produces gradual reveal/decay. Local faster Flicker can add visibility but cannot darken an originally visible particle. Point Blur is a smooth color-weight falloff; no separate image blur or glow layer is created.
- Alternatives rejected: Blurred overlay, displaced grid, Point enlargement, new animation clock, GPU/runtime replacement and unrelated canvas/export changes.
- State/output mapping: pointer.strength drives reveal and visibility; pointer.radius/softness define the field, pointer.size is bounded cell fill, pointer.speed adds local Flicker and pointer.decay returns to idle. pins.items color/core/bloom/intensity/pulse affect only color/visibility in the shared preview/export cell function. Runtime still owns export, media and storage; source caches and viewport coalescing remain unchanged.
- Performance intent: ordinary-product-work
- Verification tier: Tier 3, focused changed-feature proof. Pre-edit structural assessment passed (5 tests). The 31 directly relevant renderer/Pointer/Point/export unit tests passed across the focused runs. All seven Pointer browser scenarios passed; pins.items passed on its isolated rerun after correcting the compound-field locator. TypeScript compatibility check passed for the new renderer result and collection descriptions. No aggregate delivery/build, benchmark or measured performance was run.
- Verification: npm run test:feature selected the seven pointer.* control IDs and pins.items. Semantic checks prove added local cells, exact idle restoration, identical distant cells/gaps, saturated Point cells and unchanged cell occupancy/gaps. Blur was exercised through a real held mouse drag and its output was asserted before release. Reviewed pointer-cell-paint.png and point-cell-paint.png diagnostics. npm run dev confirmed the existing local app at http://127.0.0.1:3002/. The historical signed Windows first-delivery path assertion remains outside this request.
- Browser capability: The embedded controller still fails at startup with helper_unknown_error: apply deny-read ACLs. Headless Chromium is available for real UI proof and diagnostic screenshots. Initial reference capture loaded the controls but did not yet show the product canvas; no timing/parity claim is made.
- Proof organization: The initial selected run was blocked by a pre-existing export-clean helper authority diagnostic imported by the shared pin spec. Cell-paint acceptance now has a focused product-owned spec without that unrelated export/drag import; the protected validator and the position/export checks are preserved.
- Risks: Focused functional proof passed. Exact live-reference motion timing remains unverified because the fallback reference capture showed its shell with an empty product canvas. Existing first-delivery/runtime platform limitations remain unchanged; no performance certification is claimed.

## Decisions

### Renderer

- Decision: Intentionally rasterized Canvas 2D, cached source/tone/dither stages and evaluated dynamic cell presentation. Hover reveals fixed-grid cells; Points paint their colors without enlarging them.
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
- Evidence: Schema/animation intent and shared loop progress. Independent seeded opacity tracks close at the loop boundary; Flicker speed changes event frequency and timeline duration controls the complete cycle length.

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
