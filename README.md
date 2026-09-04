# Interactive Dither Studio

Local JPG/PNG image editor built with Pixel Point Toolcraft. Source images stay on the device; the Toolcraft runtime owns media storage, workspace persistence, history, timeline, and artifact encoding.

## Run

Requires Node.js and npm. From this folder:

```sh
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`. Open the local URL printed by the development server; its port may change when another process occupies the default port.

## Workflow

1. Import a JPG or PNG in Source. The initial canvas intentionally has no sample artwork.
2. Adjust Tone, then choose Floyd–Steinberg, Bayer, or Random dithering.
3. Set pixel size, Particle color, background, Flicker variation/speed, breathing, and pointer response.
4. Add pins and adjust their positions and pulse settings.
5. Use the top timeline to preview a loop or select a still frame.
6. Export a PNG or an MP4 through the runtime export actions. Toolcraft also exposes JPG and WebM format options.
7. Use Export Settings / Import Settings for JSON configuration transfer. Keep the original source image alongside the JSON; settings JSON is not a bundled image project.

MP4 export depends on browser encoder support. Unsupported encoding must be reported as an error, not replaced by a file with a misleading extension. MP4 input is outside the first-release scope.

## Current boundaries

- The generated Toolcraft editor shell requires at least 1024 CSS pixels of width. Phone-sized output can be configured, but the editor itself is not a mobile UI.
- A source image, preview backing, or export frame supports up to 67,108,864 pixels. The renderer supports up to 32 pins. Larger workloads produce a recoverable error; the app does not silently discard pins or reduce selected quality.
- Finite canvas size is a clip/output boundary around a stable image scene. Changing it does not stretch an existing source; Infinity removes that boundary while preserving the scene.
- Flicker independently fades particles with a deterministic seamless loop. Variation controls fade depth; Speed controls event frequency. Pointer Flicker speed accelerates that animation locally, Bulge raises the surface, Particle size enlarges dots, and Soft edge controls the transition within Radius. Breathing and pin colors remain independent.
- Guard failures in preview use a native browser alert because the signed host provides no product notification surface. Export errors use Toolcraft's own action feedback.

## Development and verification

Product code lives in `src/app` and `src/dither`. Generated runtime, bootstrap, and contract files are signed framework code; follow `AGENTS.md` before modifying the app.

```sh
npm run typecheck
npm run ai:check
```

The first completed product uses the protected `npm run verify:delivery` gate. Later changes use focused feature checks. Measured performance auditing is separate and is not implied by a functional test pass.

Implementation and verification status are recorded in `docs/toolcraft/agent-worklog.md`; this README does not claim a completed delivery receipt.
