import { describe, it, expect } from "bun:test";
import {
  getNutrientById,
  getAllNutrients,
  checkNutrientCompatibility,
  checkStockCompatibility,
  calculateMix,
  getMediaFormulation,
  getAllMedia,
  getGrowthRegulator,
  getAllGrowthRegulators,
  calculateMediaPreparation,
  ecToPpm,
  ppmToEc,
  convertUnit,
  calculatePhAdjustment,
  type Nutrient,
  type StockSolution,
  type MixTarget,
  type MixResult,
  type CompatibilityResult,
  type EC,
  type PH,
  type MediaRecipe,
} from "../src/index.ts";

// ──────────────────────────────────────────────
// Nutrient database tests
// ──────────────────────────────────────────────

describe("nutrient database", () => {
  it("lookup returns correct profile for Calcium Nitrate", () => {
    const calciumNitrate = getNutrientById("calcium-nitrate");
    expect(calciumNitrate).toBeDefined();
    expect(calciumNitrate?.name).toBe("Calcium Nitrate");
    expect(calciumNitrate?.n).toBeGreaterThan(0);
    expect(calciumNitrate?.ca).toBeGreaterThan(0);
    expect(calciumNitrate?.p).toBeUndefined();
    expect(calciumNitrate?.k).toBeUndefined();
  });

  it("returns undefined for unknown nutrient", () => {
    expect(getNutrientById("nonexistent")).toBeUndefined();
  });

  it("getAllNutrients returns all 11 nutrients", () => {
    const all = getAllNutrients();
    expect(all.length).toBe(11);
  });

  it("calcium-chloride exists with correct ca percentage", () => {
    const cacl = getNutrientById("calcium-chloride");
    expect(cacl).toBeDefined();
    expect(cacl?.ca).toBe(36.1);
    expect(cacl?.ecPerGram).toBe(1.0);
    expect(cacl?.solubility).toBe(745);
  });

  it("iron-chelate-edta has fe property", () => {
    const fe = getNutrientById("iron-chelate-edta");
    expect(fe).toBeDefined();
    expect(fe?.fe).toBe(13.0);
    expect(fe?.ecPerGram).toBe(0.2);
  });

  it("ammonium-nitrate has correct N percentage", () => {
    const an = getNutrientById("ammonium-nitrate");
    expect(an).toBeDefined();
    expect(an?.n).toBe(35.0);
  });

  it("potassium-chloride exists", () => {
    const kcl = getNutrientById("potassium-chloride");
    expect(kcl).toBeDefined();
    expect(kcl?.k).toBe(52.4);
  });

  it("urea has very low EC contribution", () => {
    const urea = getNutrientById("urea");
    expect(urea).toBeDefined();
    expect(urea?.n).toBe(46.0);
    expect(urea?.ecPerGram).toBe(0.01);
  });
});

// ──────────────────────────────────────────────
// Compatibility tests
// ──────────────────────────────────────────────

describe("compatibility checking", () => {
  it("identifies Ca-NO3 and MgSO4 as incompatible", () => {
    const result = checkNutrientCompatibility([
      "calcium-nitrate",
      "magnesium-sulfate",
    ]);
    expect(result.compatible).toBe(false);
    expect(result.incompatibilities).toHaveLength(1);
  });

  it("flags Ca-NO3 and single superphosphate as incompatible", () => {
    const result = checkNutrientCompatibility([
      "calcium-nitrate",
      "single-superphosphate",
    ]);
    expect(result.compatible).toBe(false);
    expect(result.incompatibilities.length).toBeGreaterThan(0);
    expect(result.incompatibilities[0]).toContain("cannot be mixed");
  });

  it("potassium-nitrate is compatible with everything", () => {
    const result = checkNutrientCompatibility([
      "potassium-nitrate",
      "magnesium-sulfate",
    ]);
    expect(result.compatible).toBe(true);
  });

  it("new nutrients have no incompatibilities", () => {
    const result = checkNutrientCompatibility([
      "calcium-chloride",
      "iron-chelate-edta",
      "ammonium-nitrate",
    ]);
    expect(result.compatible).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Mixer / calculateMix tests
// ──────────────────────────────────────────────

describe("calculateMix", () => {
  it("produces EC estimate within tolerance of target", () => {
    const stocks: StockSolution[] = [
      {
        id: "stock1",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
      },
      {
        id: "stock2",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 100 }],
      },
    ];
    const target: MixTarget = {
      ecTarget: 1.5 as EC,
      phTarget: 6.0 as PH,
    };
    const result = calculateMix(target, stocks);
    expect(result.ecEstimate).toBeCloseTo(1.5, 1);
    expect(Object.keys(result.dilutionRatios)).toHaveLength(2);
    expect(result.warnings.length).toBeGreaterThanOrEqual(0);
  });

  it("includes conflict warning for incompatible nutrients", () => {
    const stocks: StockSolution[] = [
      {
        id: "stock1",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
      },
      {
        id: "stock2",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "magnesium-sulfate", gramsPerLiter: 100 }],
      },
    ];
    const target: MixTarget = {
      ecTarget: 1.0 as EC,
      phTarget: 6.0 as PH,
    };
    const result = calculateMix(target, stocks);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("incompatibilities");
  });

  it("throws for empty stocks", () => {
    expect(() =>
      calculateMix({ ecTarget: 1.0 as EC }, [])
    ).toThrow("At least one stock solution required");
  });

  it("throws for negative EC target", () => {
    const stocks: StockSolution[] = [{
      id: "s1",
      dilutionFactor: 1,
      constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
    }];
    expect(() =>
      calculateMix({ ecTarget: -1 as EC }, stocks)
    ).toThrow("EC target must be positive");
  });

  it("works with new nutrients (ammonium-nitrate)", () => {
    const stocks: StockSolution[] = [{
      id: "stock-an",
      dilutionFactor: 1,
      constituents: [{ nutrientId: "ammonium-nitrate", gramsPerLiter: 50 }],
    }];
    const target: MixTarget = { ecTarget: 0.5 as EC };
    const result = calculateMix(target, stocks);
    expect(result.ecEstimate).toBeCloseTo(0.5, 1);
    expect(result.finalConcentrations.n).toBeGreaterThan(0);
  });

  it("throws when EC target exceeds achievable maximum", () => {
    const stocks: StockSolution[] = [{
      id: "s1",
      dilutionFactor: 1,
      constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 1 }],
    }];
    expect(() =>
      calculateMix({ ecTarget: 100 as EC }, stocks)
    ).toThrow("exceeds maximum achievable");
  });

  it("respects custom rounding decimals", () => {
    const stocks: StockSolution[] = [{
      id: "s1",
      dilutionFactor: 1,
      constituents: [
        { nutrientId: "calcium-nitrate", gramsPerLiter: 100 },
        { nutrientId: "potassium-nitrate", gramsPerLiter: 50 },
      ],
    }];
    const target: MixTarget = { ecTarget: 1.0 as EC };
    const result = calculateMix(target, stocks, { roundingDecimals: 1 });
    const ratio = result.dilutionRatios["s1"];
    expect(ratio.toString()).not.toContain("."); // Should be like 0.5, not 0.500
    expect(ratio).toBeCloseTo(0.5, 0);
  });

  it("warns about pH outside recommended range", () => {
    const stocks: StockSolution[] = [{
      id: "s1",
      dilutionFactor: 1,
      constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 100 }],
    }];
    const lowPh = calculateMix({ ecTarget: 0.5 as EC, phTarget: 4.0 as PH }, stocks);
    const highPh = calculateMix({ ecTarget: 0.5 as EC, phTarget: 9.0 as PH }, stocks);
    expect(lowPh.warnings.some(w => w.includes("pH"))).toBe(true);
    expect(highPh.warnings.some(w => w.includes("pH"))).toBe(true);
  });

  it("calculates final nutrient concentrations correctly", () => {
    const stocks: StockSolution[] = [
      {
        id: "ca-stock",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
      },
      {
        id: "k-stock",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 100 }],
      },
    ];
    const result = calculateMix({ ecTarget: 1.0 as EC }, stocks);
    expect(result.finalConcentrations.ca).toBeGreaterThan(0);
    expect(result.finalConcentrations.k).toBeGreaterThan(0);
    expect(result.finalConcentrations.n).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────
// Stock compatibility tests
// ──────────────────────────────────────────────

describe("checkStockCompatibility", () => {
  it("returns compatible for single stock", () => {
    const stocks: StockSolution[] = [{
      id: "s1",
      dilutionFactor: 1,
      constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 100 }],
    }];
    const result = checkStockCompatibility(stocks);
    expect(result.compatible).toBe(true);
    expect(result.incompatibilities).toHaveLength(0);
  });

  it("detects incompatibility across stocks", () => {
    const stocks: StockSolution[] = [
      {
        id: "ca-stock",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
      },
      {
        id: "mg-stock",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "magnesium-sulfate", gramsPerLiter: 100 }],
      },
    ];
    const result = checkStockCompatibility(stocks);
    expect(result.compatible).toBe(false);
    expect(result.incompatibilities.length).toBeGreaterThan(0);
  });

  it("handles multiple constituents per stock", () => {
    const stocks: StockSolution[] = [
      {
        id: "mixed",
        dilutionFactor: 1,
        constituents: [
          { nutrientId: "calcium-nitrate", gramsPerLiter: 50 },
          { nutrientId: "potassium-nitrate", gramsPerLiter: 50 },
        ],
      },
      {
        id: "sulfate",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "magnesium-sulfate", gramsPerLiter: 100 }],
      },
    ];
    const result = checkStockCompatibility(stocks);
    expect(result.compatible).toBe(false);
  });
});

// ──────────────────────────────────────────────
// EC/PPM conversion tests
// ──────────────────────────────────────────────

describe("ecToPpm", () => {
  it("converts EC 1.0 to approximately 500-700 ppm", () => {
    const ppm = ecToPpm(1.0 as EC);
    expect(ppm).toBeGreaterThanOrEqual(500);
    expect(ppm).toBeLessThanOrEqual(700);
  });

  it("converts EC 0.0 to 0 ppm", () => {
    expect(ecToPpm(0.0 as EC)).toBe(0);
  });

  it("converts EC 2.0 to double EC 1.0", () => {
    const ppm1 = ecToPpm(1.0 as EC);
    const ppm2 = ecToPpm(2.0 as EC);
    expect(ppm2).toBeCloseTo(ppm1 * 2, 0);
  });

  it("handles typical hydroponic EC values", () => {
    expect(ecToPpm(1.5 as EC)).toBeGreaterThan(ecToPpm(1.0 as EC));
    expect(ecToPpm(2.5 as EC)).toBeGreaterThan(ecToPpm(2.0 as EC));
  });
});

describe("ppmToEc", () => {
  it("converts 500 ppm to approximately EC 1.0", () => {
    const ec = ppmToEc(500);
    expect(ec).toBeCloseTo(1.0, 1);
  });

  it("converts 0 ppm to EC 0.0", () => {
    expect(ppmToEc(0)).toBe(0);
  });

  it("is inverse of ecToPpm", () => {
    const originalEc = 1.5 as EC;
    const ppm = ecToPpm(originalEc);
    const backToEc = ppmToEc(ppm);
    expect(backToEc).toBeCloseTo(originalEc, 1);
  });
});

// ──────────────────────────────────────────────
// Unit conversion tests
// ──────────────────────────────────────────────

describe("convertUnit", () => {
  it("converts grams to milligrams", () => {
    expect(convertUnit(1, "g", "mg")).toBe(1000);
    expect(convertUnit(0.5, "g", "mg")).toBe(500);
  });

  it("converts milligrams to grams", () => {
    expect(convertUnit(1000, "mg", "g")).toBe(1);
    expect(convertUnit(500, "mg", "g")).toBe(0.5);
  });

  it("converts kilograms to grams", () => {
    expect(convertUnit(1, "kg", "g")).toBe(1000);
    expect(convertUnit(2.5, "kg", "g")).toBe(2500);
  });

  it("converts liters to milliliters", () => {
    expect(convertUnit(1, "L", "mL")).toBe(1000);
    expect(convertUnit(0.25, "L", "mL")).toBe(250);
  });

  it("converts milliliters to liters", () => {
    expect(convertUnit(1000, "mL", "L")).toBe(1);
    expect(convertUnit(250, "mL", "L")).toBe(0.25);
  });

  it("returns same value for same unit", () => {
    expect(convertUnit(42, "g", "g")).toBe(42);
    expect(convertUnit(100, "mL", "mL")).toBe(100);
  });

  it("handles concentration units (g/L to mg/L)", () => {
    expect(convertUnit(1, "g/L", "mg/L")).toBe(1000);
    expect(convertUnit(500, "mg/L", "g/L")).toBe(0.5);
  });
});

// ──────────────────────────────────────────────
// pH adjustment calculation tests
// ──────────────────────────────────────────────

describe("calculatePhAdjustment", () => {
  it("calculates acid needed to lower pH", () => {
    const result = calculatePhAdjustment({
      currentPh: 7.0 as PH,
      targetPh: 5.5 as PH,
      volumeLiters: 10,
      bufferStrength: "weak",
    });
    expect(result.direction).toBe("acid");
    expect(result.amountMl).toBeGreaterThan(0);
    expect(result.acidType).toBeDefined();
  });

  it("calculates base needed to raise pH", () => {
    const result = calculatePhAdjustment({
      currentPh: 5.0 as PH,
      targetPh: 6.0 as PH,
      volumeLiters: 10,
      bufferStrength: "weak",
    });
    expect(result.direction).toBe("base");
    expect(result.amountMl).toBeGreaterThan(0);
    expect(result.baseType).toBeDefined();
  });

  it("returns zero adjustment when pH matches target", () => {
    const result = calculatePhAdjustment({
      currentPh: 6.0 as PH,
      targetPh: 6.0 as PH,
      volumeLiters: 10,
    });
    expect(result.amountMl).toBe(0);
    expect(result.direction).toBe("none");
  });

  it("scales with volume", () => {
    const small = calculatePhAdjustment({
      currentPh: 7.0 as PH,
      targetPh: 5.5 as PH,
      volumeLiters: 10,
    });
    const large = calculatePhAdjustment({
      currentPh: 7.0 as PH,
      targetPh: 5.5 as PH,
      volumeLiters: 20,
    });
    expect(large.amountMl).toBeCloseTo(small.amountMl * 2, 1);
  });

  it("accounts for buffer strength", () => {
    const weak = calculatePhAdjustment({
      currentPh: 7.0 as PH,
      targetPh: 5.5 as PH,
      volumeLiters: 10,
      bufferStrength: "weak",
    });
    const strong = calculatePhAdjustment({
      currentPh: 7.0 as PH,
      targetPh: 5.5 as PH,
      volumeLiters: 10,
      bufferStrength: "strong",
    });
    expect(strong.amountMl).toBeGreaterThan(weak.amountMl);
  });
});

// ──────────────────────────────────────────────
// Media preparation calculation tests
// ──────────────────────────────────────────────

describe("calculateMediaPreparation", () => {
  it("calculates MS media for 1 liter", () => {
    const result = calculateMediaPreparation("ms", 1);
    expect(result.totalWeightGrams).toBeGreaterThan(0);
    expect(result.components.length).toBeGreaterThan(0);
    expect(result.components.every(c => c.grams > 0)).toBe(true);
  });

  it("scales linearly with volume", () => {
    const oneLiter = calculateMediaPreparation("ms", 1);
    const twoLiters = calculateMediaPreparation("ms", 2);
    expect(twoLiters.totalWeightGrams).toBeCloseTo(oneLiter.totalWeightGrams * 2, 1);
  });

  it("includes agar when specified", () => {
    const withAgar = calculateMediaPreparation("ms", 1, { agarPercent: 0.8 });
    const agarComponent = withAgar.components.find(c => 
      c.name.toLowerCase().includes("agar")
    );
    expect(agarComponent).toBeDefined();
    expect(agarComponent?.grams).toBeCloseTo(8, 0); // 0.8% of 1L = 8g
  });

  it("includes sugar when specified", () => {
    const withSugar = calculateMediaPreparation("ms", 1, { sugarPercent: 3.0 });
    const sugarComponent = withSugar.components.find(c => 
      c.name.toLowerCase().includes("sugar") || 
      c.name.toLowerCase().includes("sucrose")
    );
    expect(sugarComponent).toBeDefined();
    expect(sugarComponent?.grams).toBeCloseTo(30, 0); // 3% of 1L = 30g
  });

  it("returns different formulations for different media types", () => {
    const ms = calculateMediaPreparation("ms", 1);
    const b5 = calculateMediaPreparation("b5", 1);
    expect(ms.totalWeightGrams).not.toBe(b5.totalWeightGrams);
  });

  it("throws for unknown media type", () => {
    expect(() => calculateMediaPreparation("unknown-media", 1)).toThrow();
  });
});

// ──────────────────────────────────────────────
// Media formulation database tests
// ──────────────────────────────────────────────

describe("media formulation database", () => {
  it("getAllMedia returns multiple formulations", () => {
    const all = getAllMedia();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("getMediaFormulation returns MS recipe", () => {
    const ms = getMediaFormulation("ms");
    expect(ms).toBeDefined();
    expect(ms?.name.toLowerCase()).toContain("murashige");
  });

  it("getMediaFormulation returns B5 recipe", () => {
    const b5 = getMediaFormulation("b5");
    expect(b5).toBeDefined();
    expect(b5?.name.toLowerCase()).toContain("gamborg");
  });

  it("returns undefined for unknown media", () => {
    expect(getMediaFormulation("nonexistent")).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// Growth regulator database tests
// ──────────────────────────────────────────────

describe("growth regulator database", () => {
  it("getAllGrowthRegulators returns regulators", () => {
    const all = getAllGrowthRegulators();
    expect(all.length).toBeGreaterThanOrEqual(3);
  });

  it("returns BAP details", () => {
    const bap = getGrowthRegulator("bap");
    expect(bap).toBeDefined();
    expect(bap?.name).toContain("Benzyl");
  });

  it("returns NAA details", () => {
    const naa = getGrowthRegulator("naa");
    expect(naa).toBeDefined();
    expect(naa?.name).toContain("Naphthalene");
  });

  it("returns undefined for unknown regulator", () => {
    expect(getGrowthRegulator("xyz")).toBeUndefined();
  });
});