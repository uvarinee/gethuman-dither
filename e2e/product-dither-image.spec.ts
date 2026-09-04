import { test } from "./toolcraft-product-test";
import { proveDitherImageArtifacts } from "./product-dither-export-scenarios";

test("browser: image format resolves real artifact settings", async ({ page }) => {
  await proveDitherImageArtifacts(page, "image.format");
});

test("browser: image resolution resolves real artifact settings", async ({ page }) => {
  await proveDitherImageArtifacts(page, "image.resolution");
});
