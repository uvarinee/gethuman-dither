# Focused particle interaction refinement

User scope: particle color, remove striped Shimmer, independent opacity flicker with speed/variation, hover acceleration and raised lens with radius/soft edge/particle size. Preserve source, tone, algorithms, pins, timeline, backing, storage and export UI.

Verification tier: Tier 3, focused renderer/control edit only. Previous aggregate gate remains blocked by a signed Windows framework assertion and is outside this request.

Decisions: retain dither.ink as Particle color (no duplicate value). Replace motion.shimmer targets with motion.flicker enabled/amount/speed; removed color is not reused. Old unrelated settings and image references remain runtime-owned. Flicker uses seeded independent circular value-noise opacity tracks; speed smoothly blends adjacent integer-cycle tracks so PNG/scrub/video agree and the timeline seam closes. Variation controls fade depth. Breathing and pins remain unchanged. Pointer uses a soft radial envelope, blends into a faster noise track, magnifies/displaces the grid as a raised lens, and independently scales particles. No brightness/color addition. Softness is an envelope transition, not a costly image blur.

Inventory: Dither unchanged except color label. Motion has Flicker toggle, Variation, Speed, existing Breathing toggle/Amount. Pointer has Response, Radius, Bulge (existing strength target), Decay, Flicker speed, Soft edge, Particle size. All use built-in controls, global properties; pointer location remains transient canvas input. Non-spatial renderer remains Canvas2D, existing top playback timeline and no layers.

Pipeline: no new source passes/resources, same guarded pixel/pin bounds; a constant amount of noise/lens math per existing visible cell, no neighborhood sampling or new blur buffers. New scalar inputs invalidate dynamic/present only. Retain coalescing and reduced-motion behavior. Canonical assessment must remain structurally valid; no measured performance authority.

Steps:
1. Update schema, inventory, acceptance and dynamic invalidation; assess existing render plan.
2. Add deterministic opacity/lens math to focused module; shared preview/export consumes it.
3. Update affected unit/browser fixtures and prove color, flicker, lens/radius/edge/size, loop seam, and one small export parity path.
4. Run relevant Vitest files and exact affected browser scenarios, plus TypeScript check because shared settings type changes. No aggregate gate, full browser suite, benchmark or performance audit.

Reference: inspected https://www.gethuman.md/sapien.html source render loop and supplied static screenshot. Reference thresholds modulated luminance with Bayer; user explicitly requests independent random opacity instead. No supplied motion file; referenceInputs remains empty. Embedded browser failed at startup; read source via HTTP and use headless Playwright for functional/visual checks.
