import { getToolcraftImageSceneRect, type ToolcraftImageAsset, type ToolcraftState } from "@/toolcraft/runtime";
export * from "./dither-settings";

export function getDitherSource(state: Pick<ToolcraftState, "mediaAssets">): ToolcraftImageAsset | undefined {
  return state.mediaAssets.find((asset): asset is ToolcraftImageAsset => asset.assetKind === "image" && asset.sourceTarget === "source.image" && asset.lifecycle === "ready");
}

export function getDitherSceneBounds({ state }: { state: Readonly<ToolcraftState> }) {
  const asset = getDitherSource(state);
  return asset ? [getToolcraftImageSceneRect(asset)] : [];
}
