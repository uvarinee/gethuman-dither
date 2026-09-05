# Stage 1: Pointer and Pins

User authorizes implementation on codex/stage-1-pointer-pins. Preserve source/tone/dither settings, runtime shell, Motion and exports.

Pointer: existing lit mask cells retain home coordinates; sparse per-cell position/velocity simulation ports the downloaded reference force law with a fixed 60 Hz step. Seven controls: response, interaction radius, repel radius, repel force, attract force, return, damping. Preserve screenshot 85/200 geometry. No random reseeding, reveal of empty cells, or hover enlargement.

Pins: hard radius mask, full RGB and alpha on lit cells only. Deterministic angular branches activate cell-by-cell outward, hold full coverage, and clear outward to base appearance. One collection owns position, color, radius, flashes per timeline loop, fill/hold/clear percentages (each 0..30 percent of one flash, remaining time rests), and branching amount. Existing normalized canvas handles remain. Persist canonical schema records and keep legacy position/color keys.

Animation inventory: Pins consume existing playback timeline progress with integer flashes for an exact seam; Pointer is transient canvas interaction independent of transport. Pause/visibility/viewport suspend non-essential simulation and discard elapsed suspension time. Export uses the same deterministic pin evaluator and no transient mouse state.

Renderer: existing Canvas2D baseline; cached source/tone/mask; sparse offsets bounded by lit mask cardinality. Dynamic field pass now models sample dimensions and renderer-scoped simulation. No GPU dependency change. Run structural assessment before renderer code, keep kernel comparison pending, no measurement authority.

Files: src/dither/pointer-physics.ts, pin-animation.ts, interaction-controls.ts, dither-renderer.ts, dither-scene.ts, dither-preview-hooks.ts, DitherCanvas.tsx; app-schema.ts, app-performance.ts, app-acceptance-data.ts; focused product unit tests and e2e Pointer/Pins helpers/specs. Update worklog.

Verification tier: Tier 3 (later focused Pointer/Pins behavior work).
Reason: Particle geometry and binary pin animation change; product shell and algorithms preserved.
Run: npm run ai:check preflight; focused Vitest physics, pin pixels, schema/assessment; npm run test:feature with changed pointer IDs, pins.items and pins.drag; focused timing/export/reload checks because new pin values affect persisted and exported animation; browser visual inspection. Typecheck because shared model changes.
Skip: aggregate delivery re-run, unrelated framework suite, full performance audit and benchmarks; no measured-performance request. Known original first-delivery Windows protected path issue remains upstream.

Plan routes: reference, renderer, controls, visual mismatch and timeline. Plan docs already read; Implementation docs schema-reference, decision-contract, component-rules, renderer-technique, performance fully read. Verification docs to read before tests.
