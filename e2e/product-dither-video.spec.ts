import { test } from "./toolcraft-product-test";
import { proveDitherVideoArtifacts } from "./product-dither-export-scenarios";

test("browser: video format resolves real artifact settings", async ({ page }) => {
  await proveDitherVideoArtifacts(page, "video.format");
});

test("browser: video resolution resolves real artifact settings", async ({ page }) => {
  await proveDitherVideoArtifacts(page, "video.resolution");
});
