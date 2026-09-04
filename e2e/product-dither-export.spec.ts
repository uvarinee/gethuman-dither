import { test } from "./toolcraft-product-test";
import { proveDitherImageArtifacts, proveDitherVideoArtifacts } from "./product-dither-export-scenarios";

test("browser: PNG export contains deterministic dither pixels", async ({ page }) => {
  await proveDitherImageArtifacts(page, "export");
});

test("browser: MP4 export contains changing dither frames", async ({ page }) => {
  await proveDitherVideoArtifacts(page, "export");
});
