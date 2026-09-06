# Export Config — implementation plan

User authority (2026-09-06): maintain a local Toolcraft fork for ZIP export without access to upstream. Preserve all current styling, settings, dither algorithms, Pointer and Pins exactly. This supersedes only the generated prohibition on the explicitly documented local extension and its verification policy; it does not authorize unrelated framework changes.

Verification scope: later feature work, Tier 3 renderer/export with a bounded local framework extension. Run baseline and final focused dither unit tests, archive validation tests, actual ZIP download and extracted-demo browser checks, Pointer/Pins regression, TypeScript and production build (new standalone bundle), and local-fork integrity. No measured performance or repeated aggregate delivery.

1. Record baseline a6b48bf and hashes of renderer, algorithms, flicker, pointer physics, pins, preview component/hooks and controls. Preserve these byte-for-byte. Move only pure scene settings/transform functions into a portable module, retaining existing imports through re-exports; verify exact function bodies.
2. Add runtime archive-download callback to the existing panel action context, backed by asynchronous fflate ZIP encoding, path/byte/count limits and existing download lifecycle. Preserve existing image/video actions.
3. Build standalone effect.js from the same source modules via a Vite plugin, avoiding stale checked-in bundles. No React/Toolcraft runtime in the resulting bundle.
4. Add versioned settings adapter and a single sticky Export Config action. Snapshot source/settings/duration/scene and artboard geometry before async work. Preserve JPG/PNG bytes and rotation/flips. Export image, JSON, JS, demo and licensing/integration notes.
5. Standalone player scales the authored scene proportionally with fixed logical geometry (resize changes presentation/backing only), uses the same pointer simulation, pin noise, tone/dither and frame painter, respects reduced motion/visibility, and exposes play/pause/seek/resize/destroy. Pointer state starts at rest; editor drag handles and pan/zoom are not website content.
6. Retain the signed upstream manifest as provenance. Add a separately named local-fork manifest with exact original/current hashes for the bounded authorized patch; verify all untouched upstream files and reject unlisted changes. Document local ownership rather than claim upstream certification.
7. Prove source preservation and deterministic render/pointer parity, real self-contained archive execution, source transformations and failure handling, then report actual results.

Workload: existing source/preview/pin limits remain. ZIP caps 16 entries and 128 MiB total input; encode only on request, no image recompression or static-field rebuild in the studio. The existing preview/render-plan assessment is unchanged. Standalone static fields are source-bound; animation redraw uses original 30 FPS presentation and 60 Hz fixed-step pointer law, with retained buffers and cleanup. No GPU/provider migration.

Controls inventory: one additional command under existing sticky actions.output, no new editable styling entity/selector. Non-spatial view, panel-owned export command, canvas-owned transient pointer and pin editing unchanged. Existing image/video/settings exports remain.

## Local-file demo correction
Later Tier 3, focused export bytes: embed the existing module, original image and settings into demo.html using data URLs. Keep the developer files and LICENSE unchanged. No renderer/runtime edits. Verify archive data and actual file:// opening with playback and pixels; retain HTTP player parity check. Existing signed feature preflight limitation remains; use the focused direct Playwright scenario.

## Studio settings companion
Later Tier 2: add studio-settings.json using the existing public createToolcraftSettingsPayload serializer, serialized before async source reads. Preserve developer settings/demo and source. Verify exact native payload, asynchronous snapshot and browser import onto another image. No runtime or styler changes; focused ZIP unit and browser tests only.
