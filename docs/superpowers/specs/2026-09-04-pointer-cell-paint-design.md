# Pointer and Point cell painting

The user approved implementing both effects in `feat/pointer-hover`. This is a redesign of existing effects, not a clone of the reference editor. The project contract permits immediate spec, plan and implementation without generic brainstorming approval rituals.

Pointer follows the cursor and reveals additional grid cells to create a locally denser light patch. A deterministic coarse spatial field gives the contour an organic shape. Source tone weights reveal so black source areas remain empty. Strength replaces Bulge and governs reveal/visibility; radius, decay, local Flicker speed, soft edge and particle size remain. Cell centers never move; hover size is bounded to retain cell gaps. Leaving fades back to the exact original mask.

Point means the existing pins.items entities. Each Point colors individual dots, with a fully weighted Core and a smooth Blur falloff using the existing bloom value. Intensity mixes the chosen color; Single/Double pulse still modulates the paint. Point never enlarges particles or paints their gaps. Color influence restores local particle visibility during Flicker. Shared rendering makes Point identical in preview and exports; transient hover remains excluded from export.

Chosen approach: per-cell paint in the existing Canvas 2D renderer. A blurred overlay contradicts the screenshot; replacing the renderer would expand scope unnecessarily. Source/tone/dither caches and canonical pipeline remain; bounded scalar math runs in the existing cell loop. Current workload envelope, guards, viewport coalescing and selected backing quality remain authoritative. The structural assessment passed before implementation; no performance measurement is authorized.

Canvas owns hover and direct Point dragging; the panel owns exact coordinates, collection editing and properties. View stays non-spatial. Runtime timeline, layers-off decision, persistence, settings targets and export controls stay as implemented.

References: static screenshots codex-clipboard-8dd9c2e1-afb6-4dac-814e-0f80e07da68e.png and codex-clipboard-689324eb-5e51-4649-adae-ea095d8d3101.png; https://shaders.evilrabbit.com/#dither. The embedded controller fails at startup with Windows helper_unknown_error: apply deny-read ACLs; live-reference timing/parity is unconfirmed. No motion media was supplied, so referenceInputs stays empty and no motion preprocessing runs.

Acceptance: local occupancy grows under hover, distant cells and grid centers remain unchanged, no painting occurs between cells, soft falloff and decay restore the original mask, Point color is saturated at its core without changing geometry, zero intensity is neutral, and timeline endpoints agree. Focused UI checks cover Pointer parameters and Point collection/color/position. Shared-renderer pixel checks cover exported paint semantics without format/resolution matrices.
