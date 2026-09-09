import assert from "node:assert/strict";
import test from "node:test";

import {
  mapChurchTaxRateToKirchensteuer,
  resolveChurchTaxRateFromStammdaten,
} from "./tax-year-options.ts";

test("mapChurchTaxRateToKirchensteuer – 0.08 -> 8", () => {
  assert.equal(mapChurchTaxRateToKirchensteuer(0.08), "8");
});

test("mapChurchTaxRateToKirchensteuer – 0.09 -> 9", () => {
  assert.equal(mapChurchTaxRateToKirchensteuer(0.09), "9");
});

test("mapChurchTaxRateToKirchensteuer – null -> none", () => {
  assert.equal(mapChurchTaxRateToKirchensteuer(null), "none");
});

test("mapChurchTaxRateToKirchensteuer – undefined -> none", () => {
  assert.equal(mapChurchTaxRateToKirchensteuer(undefined), "none");
});

test("mapChurchTaxRateToKirchensteuer – String aus numeric-Spalte", () => {
  assert.equal(mapChurchTaxRateToKirchensteuer(Number("0.080")), "8");
});

test("resolveChurchTaxRateFromStammdaten – nicht pflichtig -> null", () => {
  assert.equal(resolveChurchTaxRateFromStammdaten(false, "BY"), null);
});

test("resolveChurchTaxRateFromStammdaten – BY -> 0.08", () => {
  assert.equal(resolveChurchTaxRateFromStammdaten(true, "BY"), 0.08);
});

test("resolveChurchTaxRateFromStammdaten – HE -> 0.09", () => {
  assert.equal(resolveChurchTaxRateFromStammdaten(true, "HE"), 0.09);
});
