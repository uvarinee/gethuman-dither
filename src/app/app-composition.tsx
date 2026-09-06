import { exportConfig } from "../export-config/archive";
import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { appRendererPipelineRegistration } from "./app-performance";
import { DitherCanvas } from "@/dither/DitherCanvas";
import { ditherExportRenderer } from "@/dither/dither-export";
import { getDitherSceneBounds } from "@/dither/dither-scene";

export const appComposition: ToolcraftAppComposition = {
  onPanelAction: exportConfig,
  modelPresentation: { mode: "runtime" },
  schema: appSchema,
  canvasContent: <DitherCanvas />,
  sceneBoundsProvider: getDitherSceneBounds,
  rendererPipelineRegistration: appRendererPipelineRegistration,
  renderDefaultCanvasMedia: false,
  exportRenderer: ditherExportRenderer,
};
