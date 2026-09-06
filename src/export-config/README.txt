Interactive Dither — developer export, format version 1

Unzip the archive and double-click demo.html. No server or installation is needed.
The demo contains a snapshot of the image, settings and engine and works offline.
Editing the separate developer files does not change this embedded preview.
No npm, React, Toolcraft, CDN or external JavaScript dependency is needed.

Reuse the style in the studio:
Upload another image, click Import Settings and choose import-style.json.
This is the native Export Settings format: it restores effect controls, pins,
canvas settings and timeline without replacing the image you uploaded.
settings.json is for the standalone website engine; do not import it into the studio.

Integration:
import { createDitherEffect } from "./effect.js";
const settings = await fetch("./settings.json").then(r => r.json());
const effect = await createDitherEffect({
  container: document.querySelector("#hero"),
  imageUrl: "./" + settings.image,
  settings,
  autoplay: true
});

The container needs a non-zero width. Its height follows the exported aspect ratio.
Keep image and settings paths relative to YOUR page or use absolute URLs.
The original JPG/PNG is preserved; source flips/rotation happen during decoding.
Finite output preserves the authored artboard crop and background; Infinity output
uses the source scene bounds. Editor zoom/pan and pin handles are not website output.
Resizing proportionally scales the authored composition and pointer coordinates;
it does not change the dither grid, pin radii or layout. For a different layout,
create another design/export. Backing resolution uses DPR and exported renderScale;
unsupported dimensions report an error instead of silently lowering quality.

Methods: play(), pause(), seek(seconds), resize(), destroy().
Properties: canvas, currentTime, isPlaying, error.
Optional AbortSignal cancels image loading or destroys the mounted instance.
Listen for a bubbling dither-error event on the container for rendering failures.
Pause freezes the authored animation; pointer physics still responds as in the studio.
Seek clears transient pointer displacement. Each instance starts at rest.
Settings contain authored controls, not the editor undo stack or mouse trajectory.
Reduced-motion preference freezes animation at phase zero and disables pointer physics.
Hidden/offscreen effects suspend their frame loop and resume without a time jump.

To change a design programmatically, destroy the old instance and create a new one
with valid version-1 settings. Keep effect.js paired with its settings.json.
The downloaded module is built from the same algorithms as the studio.
Keep LICENSE.txt with redistributed code. Image rights remain with the image owner.
