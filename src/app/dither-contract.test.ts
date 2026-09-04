import { expect, it } from "vitest";
import { validateProductAcceptanceCoverage } from "./app-acceptance";

it("keeps the complete dither product acceptance structure valid", () => {
  expect(validateProductAcceptanceCoverage()).toEqual([]);
});
