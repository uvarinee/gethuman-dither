# Interactive Dither Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local image-to-dither editor with interactive Canvas preview and deterministic PNG, MP4, and JSON exports.

**Architecture:** Toolcraft generates a React/TypeScript app. Internal modules separate scene schema, cached Canvas renderer, editor UI, and reusable React runtime; animation frames reuse the static particle field.

**Tech Stack:** Toolcraft, React, TypeScript, Vite, Canvas 2D, Vitest, Testing Library, WebCodecs, `mp4-muxer`, CSS.

## Global Constraints

- JPG/PNG input; exactly PNG/MP4/versioned JSON export.
- Local-only Canvas 2D processing.
- Floyd–Steinberg, Bayer 8×8, seeded random.
- Deterministic JSON round-trip; normalized pin coordinates.
- 30 fps cap, offscreen/hidden pause, reduced-motion frame.
- Original dark technical UI; no Tooooools interface copying.

---

### Task 1: Scaffold and shell

**Files:** `package.json`, `vite.config.ts`, `src/main.tsx`, `src/app/App.tsx`, `src/app/App.test.tsx`, `src/styles/app.css`, `src/test/setup.ts`, `references/*`.

**Interfaces:** Produces the runnable testable three-region workspace.

- [ ] Verify public `@pixel-point/toolcraft` using project-local npm cache.
- [ ] Run `toolcraft create . --name interactive-dither-studio --yes --force`; use temporary pnpm if needed.
- [ ] Write a failing landmark test.
- [ ] Implement the rail, inspector, fluid stage and palette `#0a0a09/#f3f1eb/#30302c/#8c8a82/#ff5c30`.
- [ ] Copy both supplied images into stable `references/` names.
- [ ] Run focused test/build; commit `feat: scaffold dither studio workspace`.

### Task 2: Schema, history, and algorithms

**Files:** `src/scene-schema/*`, `src/editor/history.ts`, `history.test.ts`, `src/renderer-core/algorithms.ts`, `algorithms.test.ts`, `image.ts`.

**Interfaces:** Produces `SceneV1`, `ScenePin`, `DEFAULT_SCENE`, `parseScene`, immutable `HistoryStore`, `preprocess`, three dither functions, and local image helpers.

- [ ] Test validation, migration, undo/redo, deterministic seeds, exact output, and immutability; verify red.
- [ ] Define all source/canvas/preprocess/dither/palette/motion/pointer/pins/responsive/performance/accessibility/export fields.
- [ ] Implement immutable parsing with readable errors and 50-entry history.
- [ ] Implement luminance, blur, grain, gamma, remapping, Floyd–Steinberg, Bayer 8×8, and seeded random.
- [ ] Decode only JPG/PNG up to 40 MB; implement crop sampling/disposal.
- [ ] Run suites; commit `feat: add deterministic scene pipeline`.

### Task 3: Shared renderer and editor

**Files:** `src/renderer-core/{fields,engine}.ts`, tests, `src/react-runtime/DitherScene.tsx`, tests, `src/editor/{controls,Inspector,ProjectRail,Stage}.tsx`, `src/app/*`, `src/styles/app.css`.

**Interfaces:** Produces `createDitherEngine` with lifecycle methods, reusable `DitherScene`, and complete editing flow.

- [ ] Test pointer, breathing, double pulses, lifecycle, upload errors, controls, history, recovery, previews, pin editing; verify red.
- [ ] Implement cached static stages and dynamic fields at 30 fps.
- [ ] Implement resize/intersection/visibility/reduced-motion/fallback/pointer lifecycle.
- [ ] Build accessible controls and Source/Preprocess/Dither/Motion/Pointer/Pins/Export groups.
- [ ] Implement drop/picker/replace, cleanup, localStorage, history, reset, desktop/mobile preview.
- [ ] Implement normalized pin add/select/drag/delete, percentages, keyboard movement.
- [ ] Finish responsive layout, run tests/build; commit `feat: build interactive dither editor`.

### Task 4: Exports

**Files:** `src/editor/exports.ts`, tests, relevant editor components, `package.json`.

**Interfaces:** Produces `exportSceneJson`, `exportPng`, `exportMp4`, `downloadBlob`.

- [ ] Test JSON, PNG, MP4 support/timestamps/progress/cancel/cleanup; verify red.
- [ ] Validate and serialize JSON stably.
- [ ] Render scaled PNG and restore preview in `finally`.
- [ ] Add `mp4-muxer`; verify AVC/H.264 via WebCodecs.
- [ ] Render exact timestamps, honor cancellation, close resources, restore rendering.
- [ ] Expose exactly three export actions, run tests/build; commit `feat: export png mp4 and scene json`.

### Task 5: Integration and visual QA

**Files:** test files above, `src/styles/app.css`, `README.md`.

**Interfaces:** Produces verified and documented Image MVP.

- [ ] Test upload→edit→JSON/re-import, missing source, pause lifecycle, reduced motion, keyboard, corrupt files.
- [ ] Run tests, `npm.cmd run ai:check`, and build.
- [ ] Capture 1440×1000 and 390×844 screenshots using the reference.
- [ ] Compare crop, silhouettes, density, midtones, focus, responsiveness, overflow; tune and retest.
- [ ] Document setup, formats, MP4 requirements, privacy, handoff, and runtime integration.
- [ ] Verify and remove only project-local npm/pnpm caches.
- [ ] Commit `docs: finish dither studio verification`.

