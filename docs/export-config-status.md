# Export Config status

Date: 2026-09-06
Branch: new-export-config
Styler baseline: a6b48bf (released Pointer physics and Pin noise/scatter).

Implemented a user-authorized local Toolcraft ZIP extension. Upstream source is no longer a prerequisite. The original signed manifest, LICENSE.md and NOTICE.md remain unchanged; docs/local-toolcraft-fork.json pins only six explicitly approved files. This is a user-maintained fork, not an upstream-signed release.

Export Config downloads effect/image.png or image.jpg (original bytes), settings.json, effect.js, demo.html, README.txt and LICENSE.txt. The versioned snapshot includes all effect controls, pins, pointer parameters, source transformations, authored scene/artboard, background option, quality and timeline phase. The standalone engine bundles the existing effect functions without React or Toolcraft. It supports play, pause, seek, resize and destroy. Unzip and double-click demo.html: it embeds its source image, settings and engine and works offline via file://. The separate developer files remain available for website integration; editing them does not alter the embedded demo snapshot.

The original studio renderer, canvas, Pointer and Pin implementations remain byte-identical to the recorded baseline. Pure settings/transform helpers were extracted without changing their implementation, with an additional preservation hash test. Viewport/pan/zoom and editor overlays are not exported; the authored output scales proportionally in the destination container. Live transient pointer displacement is not saved: the exported player starts at rest and reacts to its own pointer.

Verification:
- Production build and ai:check passed.
- 14 focused Vitest files / 66 tests passed.
- Local fork policy tests: 3 passed; integrity: 686 files passed.
- Real ZIP download and independent demo/player browser test passed, including exact pixel comparison against the studio at the exported phase, pointer recovery, loop, transport, resize and teardown.
- Existing Pointer/Pin browser checks: 9 passed in the first run; long Pins paint test exceeded 30s under concurrent build and passed independently in 27.3s with a 120s ceiling. All 10 selected scenarios passed across those runs.

Limitations of verification:
- test:feature stops before tests because its separate signed-config preflight rejects the locally changed vite.config.ts. That independent upstream verifier is unmodified; no protected feature receipt is claimed. Direct Playwright checks ran using the existing project configuration.
- Host-embedded browser failed before startup with Windows sandbox apply deny-read ACLs. Real automated Chromium verification was used; no manual visual inspection is claimed.
- No new aggregate delivery gate or performance audit; this is a focused later feature.
- No commit, push or deployment performed.

The ZIP also includes import-style.json in the existing native Export Settings format. Import it via Import Settings after loading another image. It restores effect values, canvas and timeline and does not replace source media. The separate settings.json remains the website engine configuration.
