# User-maintained Toolcraft ZIP extension

The user explicitly authorized the local fork and its exact integrity policy on 2026-09-06. This is not an official Toolcraft release.

The original signed manifest stays untouched. docs/local-toolcraft-fork.json records original and current SHA-256 values for six specifically permitted files. The checker verifies the original signature first, then the explicit local overlay and every remaining protected file. Unlisted runtime changes still fail. Neither build nor test updates the hashes automatically. Test results and existing receipts are never rewritten.

The extension adds downloadArchive to panel action context, asynchronous ZIP encoding, .zip delivery, and a standalone-bundle Vite plugin. Future upstream updates require deliberate reconciliation. Preserve LICENSE.md and NOTICE.md.

The unchanged stylist baseline is a6b48bf: dither algorithms, renderer, flicker, pin animation, pointer physics, interaction controls, canvas/handles/hooks/CSS. Only pure settings helpers move to dither-settings.ts with the existing scene module re-exporting them. Regression tests check exact source identity and behavior.
