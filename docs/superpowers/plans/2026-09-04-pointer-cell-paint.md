# Pointer and Point plan

Verification tier: Tier 3 — focused later product edit
Reason: Two existing cell-rendering behaviors and their labels/help change.
Run: focused renderer/Pointer/Point unit tests; npm run test:feature -- pointer.enabled pointer.radius pointer.strength pointer.decay pointer.speed pointer.softness pointer.size pins.items; semantic hover/Point browser pixel checks; local dev preview.
Skip: aggregate delivery/build, unrelated product checks, reload/theme/format/resolution matrices, benchmarks and measured performance. The previous signed Windows path assertion remains an upstream first-delivery blocker outside this request.

1. Confirm typed renderer assessment and cache invalidation before edits (completed: 5 focused structural tests passed).
2. Add focused cell-field math and update src/dither/dither-renderer.ts for deterministic hover reveal and Point color falloff. Preserve static caches, scene coordinates and shared export callback.
3. Update acceptance outcomes/inventory in src/app/app-acceptance-data.ts before adjusting labels/help in src/app/app-schema.ts. Preserve existing targets and defaults.
4. Update directly affected renderer, flicker and pin/pointer unit tests. Add semantic pixel checks to product-owned browser scenarios, using protected helpers for registered rows.
5. Run focused checks, diagnose only actual failures, inspect screenshots, leave the dev app available and record results in docs/toolcraft/agent-worklog.md.

Completed: 5 pre-edit structural tests and 31 focused renderer/Pointer/Point/shared-export tests passed; seven Pointer browser rows passed and pins.items passed in its isolated rerun. A TypeScript check was added specifically to validate the expanded renderer result and nested collection descriptions; it passed. Browser screenshots were reviewed. Existing dev server is available at http://127.0.0.1:3002/. No aggregate or measured-performance checks ran.
