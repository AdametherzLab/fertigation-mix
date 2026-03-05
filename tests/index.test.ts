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

  it("throws if target EC exceeds maximum achievable", () => {
    const stocks: StockSolution[] = [{
      id: "stock1",
      dilutionFactor: 1,
      constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 10 }], // Low concentration
    }];
    const target: MixTarget = { ecTarget: 5.0 as EC }; // High target
    expect(() => calculateMix(target, stocks)).toThrow(/EC target .* exceeds maximum achievable/);
  });

  it("calculates correct nutrient concentrations for a simple mix", () => {
    const stocks: StockSolution[] = [
      {
        id: "stock-kn",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 100 }],
      },
    ];
    const target: MixTarget = { ecTarget: 1.0 as EC };
    const result = calculateMix(target, stocks);

    const kn = getNutrientById("potassium-nitrate");
    expect(kn).toBeDefined();

    // Calculate expected N and K based on 1.0 EC target
    // 1.0 EC / (100 g/L * 0.65 EC/g) = 1.0 / 65 = 0.01538 dilution factor
    // N: 13.9% * 100 g/L * 0.01538 = 21.38 mg/L
    // K: 38.7% * 100 g/L * 0.01538 = 59.5 mg/L
    const expectedDilutionFactor = target.ecTarget / (100 * (kn?.ecPerGram || 0));
    const expectedN = (kn?.n || 0) * 100 * expectedDilutionFactor;
    const expectedK = (kn?.k || 0) * 100 * expectedDilutionFactor;

    expect(result.finalConcentrations.n).toBeCloseTo(expectedN, 1);
    expect(result.finalConcentrations.k).toBeCloseTo(expectedK, 1);
    expect(result.dilutionRatios["stock-kn"]).toBeCloseTo(expectedDilutionFactor, 3);
  });

  it("handles multiple constituents in a single stock", () => {
    const stocks: StockSolution[] = [
      {
        id: "stock-combo",
        dilutionFactor: 1,
        constituents: [
          { nutrientId: "calcium-nitrate", gramsPerLiter: 50 },
          { nutrientId: "potassium-nitrate", gramsPerLiter: 50 },
        ],
      },
    ];
    const target: MixTarget = { ecTarget: 1.0 as EC };
    const result = calculateMix(target, stocks);
    expect(result.ecEstimate).toBeCloseTo(1.0, 1);
    expect(result.finalConcentrations.n).toBeGreaterThan(0);
    expect(result.finalConcentrations.k).toBeGreaterThan(0);
    expect(result.finalConcentrations.ca).toBeGreaterThan(0);
  });

  it("applies dilution factor correctly to stock solutions", () => {
    const stocks: StockSolution[] = [
      {
        id: "stock-diluted",
        dilutionFactor: 100, // 1:100 dilution
        constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 1000 }], // 1000g/L stock
      },
    ];
    const target: MixTarget = { ecTarget: 1.0 as EC };
    const result = calculateMix(target, stocks);

    const cn = getNutrientById("calcium-nitrate");
    expect(cn).toBeDefined();

    // Effective concentration in working solution is 1000g/L / 100 = 10g/L
    // Effective EC contribution is 10g/L * 0.72 EC/g = 7.2 EC
    // Dilution ratio for 1.0 EC target: 1.0 / 7.2 = 0.13888...
    const effectiveGramsPerLiter = 1000 / 100;
    const effectiveEcContribution = effectiveGramsPerLiter * (cn?.ecPerGram || 0);
    const expectedDilutionRatio = target.ecTarget / effectiveEcContribution;

    expect(result.dilutionRatios["stock-diluted"]).toBeCloseTo(expectedDilutionRatio, 3);
    expect(result.ecEstimate).toBeCloseTo(1.0, 1);
  });

  it("adds warning for pH target outside recommended range", () => {
    const stocks: StockSolution[] = [
      {
        id: "stock1",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 100 }],
      },
    ];
    const target: MixTarget = { ecTarget: 1.0 as EC, phTarget: 3.0 as PH };
    const result = calculateMix(target, stocks);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Target pH outside recommended hydroponic range");
  });

  it("does not add warning for pH target within recommended range", () => {
    const stocks: StockSolution[] = [
      {
        id: "stock1",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 100 }],
      },
    ];
    const target: MixTarget = { ecTarget: 1.0 as EC, phTarget: 6.0 as PH };
    const result = calculateMix(target, stocks);
    expect(result.warnings.length).toBe(0);
  });

  it("uses custom rounding precision", () => {
    const stocks: StockSolution[] = [
      {
        id: "stock1",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
      },
    ];
    const target: MixTarget = { ecTarget: 1.5 as EC };
    const result = calculateMix(target, stocks, { roundingDecimals: 5 });
    // Expect more decimal places than default (3)
    const ratio = result.dilutionRatios["stock1"];
    expect(ratio.toString().split('.')[1]?.length || 0).toBeGreaterThanOrEqual(5);
  });

  it("checkStockCompatibility identifies incompatibility between two stocks", () => {
    const stocks: StockSolution[] = [
      {
        id: "stockA",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
      },
      {
        id: "stockB",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "magnesium-sulfate", gramsPerLiter: 100 }],
      },
    ];
    const result = checkStockCompatibility(stocks);
    expect(result.compatible).toBe(false);
    expect(result.incompatibilities).toHaveLength(1);
    expect(result.incompatibilities[0]).toContain("calcium-nitrate <-> magnesium-sulfate");
  });

  it("checkStockCompatibility returns compatible for compatible stocks", () => {
    const stocks: StockSolution[] = [
      {
        id: "stockA",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 100 }],
      },
      {
        id: "stockB",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "urea", gramsPerLiter: 100 }],
      },
    ];
    const result = checkStockCompatibility(stocks);
    expect(result.compatible).toBe(true);
    expect(result.incompatibilities).toHaveLength(0);
  });

  it("checkStockCompatibility handles multiple constituents within a single stock", () => {
    const stocks: StockSolution[] = [
      {
        id: "stockA",
        dilutionFactor: 1,
        constituents: [
          { nutrientId: "calcium-nitrate", gramsPerLiter: 50 },
          { nutrientId: "potassium-nitrate", gramsPerLiter: 50 },
        ],
      },
      {
        id: "stockB",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "magnesium-sulfate", gramsPerLiter: 100 }],
      },
    ];
    const result = checkStockCompatibility(stocks);
    expect(result.compatible).toBe(false);
    expect(result.incompatibilities).toHaveLength(1);
    expect(result.incompatibilities[0]).toContain("calcium-nitrate <-> magnesium-sulfate");
  });

  it("checkStockCompatibility handles multiple incompatibilities", () => {
    const stocks: StockSolution[] = [
      {
        id: "stockA",
        dilutionFactor: 1,
        constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
      },
      {
        id: "stockB",
        dilutionFactor: 1,
        constituents: [
          { nutrientId: "magnesium-sulfate", gramsPerLiter: 50 },
          { nutrientId: "monopotassium-phosphate", gramsPerLiter: 50 },
        ],
      },
    ];
    const result = checkStockCompatibility(stocks);
    expect(result.compatible).toBe(false);
    expect(result.incompatibilities).toHaveLength(2);
    expect(result.incompatibilities).toContain("calcium-nitrate <-> magnesium-sulfate");
    expect(result.incompatibilities).toContain("calcium-nitrate <-> monopotassium-phosphate");
  });
});

// ──────────────────────────────────────────────
// Media preparation tests
// ──────────────────────────────────────────────

describe("media preparation", () => {
  it("calculates correct amounts for MS media", () => {
    const msMedia = getMediaFormulation("ms-basal-salt-mixture");
    expect(msMedia).toBeDefined();
    const recipe: MediaRecipe = {
      mediaId: "ms-basal-salt-mixture",
      volumeMl: 1000,
      sucroseGrams: 30,
      agarGrams: 8,
      growthRegulators: [],
    };
    const result = calculateMediaPreparation(recipe);
    expect(result.mediaSaltGrams).toBeCloseTo(4.4, 2);
    expect(result.sucroseGrams).toBe(30);
    expect(result.agarGrams).toBe(8);
    expect(result.totalGrams).toBeCloseTo(42.4, 2);
    expect(result.steps.length).toBeGreaterThan(5);
    expect(result.steps[0]).toContain("4.40 grams of MS Basal Salt Mixture");
  });

  it("calculates correct amounts for custom media", () => {
    const recipe: MediaRecipe = {
      mediaId: "custom",
      customMediaSalts: [
        { nutrientId: "calcium-nitrate", mgPerLiter: 100 },
        { nutrientId: "potassium-nitrate", mgPerLiter: 50 },
      ],
      volumeMl: 500,
      sucroseGrams: 20,
      agarGrams: 5,
      growthRegulators: [],
    };
    const result = calculateMediaPreparation(recipe);
    expect(result.mediaSaltGrams).toBeCloseTo(0.075, 3); // (100+50)mg/L * 0.5L = 75mg = 0.075g
    expect(result.sucroseGrams).toBe(20);
    expect(result.agarGrams).toBe(5);
    expect(result.totalGrams).toBeCloseTo(25.075, 3);
    expect(result.steps.length).toBeGreaterThan(5);
    expect(result.steps[0]).toContain("0.05 grams of Calcium Nitrate");
    expect(result.steps[1]).toContain("0.025 grams of Potassium Nitrate");
  });

  it("includes growth regulators in calculation and steps", () => {
    const recipe: MediaRecipe = {
      mediaId: "ms-basal-salt-mixture",
      volumeMl: 1000,
      sucroseGrams: 30,
      agarGrams: 8,
      growthRegulators: [{ id: "bap", mgPerLiter: 1 }],
    };
    const result = calculateMediaPreparation(recipe);
    expect(result.growthRegulatorGrams?.bap).toBeCloseTo(0.001, 3); // 1mg/L * 1L = 1mg = 0.001g
    expect(result.totalGrams).toBeCloseTo(42.401, 3);
    expect(result.steps.some((s) => s.includes("BAP"))).toBe(true);
  });

  it("throws error for unknown media formulation", () => {
    const recipe: MediaRecipe = {
      mediaId: "nonexistent-media",
      volumeMl: 1000,
      sucroseGrams: 30,
      agarGrams: 8,
      growthRegulators: [],
    };
    expect(() => calculateMediaPreparation(recipe)).toThrow("Unknown media formulation");
  });

  it("throws error for invalid volume", () => {
    const recipe: MediaRecipe = {
      mediaId: "ms-basal-salt-mixture",
      volumeMl: 0,
      sucroseGrams: 30,
      agarGrams: 8,
      growthRegulators: [],
    };
    expect(() => calculateMediaPreparation(recipe)).toThrow("Volume must be positive");
  });

  it("getAllMedia returns all media formulations", () => {
    const allMedia = getAllMedia();
    expect(allMedia.length).toBeGreaterThan(0);
    expect(allMedia.some((m) => m.id === "ms-basal-salt-mixture")).toBe(true);
  });

  it("getMediaFormulation returns correct media by ID", () => {
    const ms = getMediaFormulation("ms-basal-salt-mixture");
    expect(ms).toBeDefined();
    expect(ms?.name).toBe("MS Basal Salt Mixture");
  });

  it("getMediaFormulation returns undefined for unknown ID", () => {
    expect(getMediaFormulation("nonexistent")).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// Growth Regulator tests
// ──────────────────────────────────────────────

describe("growth regulators", () => {
  it("getGrowthRegulator returns correct GR by ID", () => {
    const bap = getGrowthRegulator("bap");
    expect(bap).toBeDefined();
    expect(bap?.name).toBe("6-Benzylaminopurine (BAP)");
  });

  it("getGrowthRegulator returns undefined for unknown ID", () => {
    expect(getGrowthRegulator("nonexistent-gr")).toBeUndefined();
  });

  it("getAllGrowthRegulators returns all GRs", () => {
    const allGRs = getAllGrowthRegulators();
    expect(allGRs.length).toBeGreaterThan(0);
    expect(allGRs.some((gr) => gr.id === "bap")).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Unit conversion tests
// ──────────────────────────────────────────────

describe("unit conversions", () => {
  it("ecToPpm converts correctly using 500 factor", () => {
    expect(ecToPpm(1.0 as EC, 500)).toBe(500);
    expect(ecToPpm(2.5 as EC, 500)).toBe(1250);
  });

  it("ecToPpm converts correctly using 700 factor", () => {
    expect(ecToPpm(1.0 as EC, 700)).toBe(700);
    expect(ecToPpm(2.0 as EC, 700)).toBe(1400);
  });

  it("ppmToEc converts correctly using 500 factor", () => {
    expect(ppmToEc(500, 500)).toBe(1.0);
    expect(ppmToEc(1250, 500)).toBe(2.5);
  });

  it("ppmToEc converts correctly using 700 factor", () => {
    expect(ppmToEc(700, 700)).toBe(1.0);
    expect(ppmToEc(1400, 700)).toBe(2.0);
  });

  it("convertUnit converts mg/L to ppm", () => {
    expect(convertUnit(100, "mg/L", "ppm")).toBe(100);
  });

  it("convertUnit converts ppm to mg/L", () => {
    expect(convertUnit(100, "ppm", "mg/L")).toBe(100);
  });

  it("convertUnit converts g to mg", () => {
    expect(convertUnit(1, "g", "mg")).toBe(1000);
  });

  it("convertUnit converts mg to g", () => {
    expect(convertUnit(1000, "mg", "g")).toBe(1);
  });

  it("convertUnit converts L to mL", () => {
    expect(convertUnit(1, "L", "mL")).toBe(1000);
  });

  it("convertUnit converts mL to L", () => {
    expect(convertUnit(1000, "mL", "L")).toBe(1);
  });

  it("convertUnit throws for unsupported conversion", () => {
    expect(() => convertUnit(1, "g", "L")).toThrow("Unsupported unit conversion");
  });
});

// ──────────────────────────────────────────────
// pH adjustment tests
// ──────────────────────────────────────────────

describe("pH adjustment", () => {
  it("calculates acid amount for lowering pH", () => {
    const result = calculatePhAdjustment({
      currentPh: 7.0 as PH,
      targetPh: 5.8 as PH,
      solutionVolumeL: 10,
      phAdjusterType: "acid",
      adjusterConcentration: 80, // 80% phosphoric acid
    });
    expect(result.adjusterVolumeMl).toBeGreaterThan(0);
    expect(result.adjusterVolumeMl).toBeLessThan(100); // Should be a reasonable amount
    expect(result.warnings.length).toBe(0);
  });

  it("calculates base amount for raising pH", () => {
    const result = calculatePhAdjustment({
      currentPh: 5.0 as PH,
      targetPh: 6.2 as PH,
      solutionVolumeL: 5,
      phAdjusterType: "base",
      adjusterConcentration: 25, // 25% potassium hydroxide
    });
    expect(result.adjusterVolumeMl).toBeGreaterThan(0);
    expect(result.adjusterVolumeMl).toBeLessThan(50); // Should be a reasonable amount
    expect(result.warnings.length).toBe(0);
  });

  it("returns 0 if current pH is already at target", () => {
    const result = calculatePhAdjustment({
      currentPh: 6.0 as PH,
      targetPh: 6.0 as PH,
      solutionVolumeL: 10,
      phAdjusterType: "acid",
      adjusterConcentration: 80,
    });
    expect(result.adjusterVolumeMl).toBe(0);
    expect(result.warnings.length).toBe(0);
  });

  it("throws error for invalid pH values", () => {
    expect(() =>
      calculatePhAdjustment({
        currentPh: 15.0 as PH,
        targetPh: 6.0 as PH,
        solutionVolumeL: 10,
        phAdjusterType: "acid",
        adjusterConcentration: 80,
      })
    ).toThrow("pH values must be between 0 and 14");

    expect(() =>
      calculatePhAdjustment({
        currentPh: 7.0 as PH,
        targetPh: -1.0 as PH,
        solutionVolumeL: 10,
        phAdjusterType: "acid",
        adjusterConcentration: 80,
      })
    ).toThrow("pH values must be between 0 and 14");
  });

  it("throws error for invalid adjuster concentration", () => {
    expect(() =>
      calculatePhAdjustment({
        currentPh: 7.0 as PH,
        targetPh: 6.0 as PH,
        solutionVolumeL: 10,
        phAdjusterType: "acid",
        adjusterConcentration: 150,
      })
    ).toThrow("Adjuster concentration must be between 1 and 100");
  });

  it("throws error for zero solution volume", () => {
    expect(() =>
      calculatePhAdjustment({
        currentPh: 7.0 as PH,
        targetPh: 6.0 as PH,
        solutionVolumeL: 0,
        phAdjusterType: "acid",
        adjusterConcentration: 80,
      })
    ).toThrow("Solution volume must be positive");
  });

  it("adds warning if acid is used to raise pH", () => {
    const result = calculatePhAdjustment({
      currentPh: 5.0 as PH,
      targetPh: 6.0 as PH,
      solutionVolumeL: 10,
      phAdjusterType: "acid",
      adjusterConcentration: 80,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Using acid to raise pH is unusual");
  });

  it("adds warning if base is used to lower pH", () => {
    const result = calculatePhAdjustment({
      currentPh: 7.0 as PH,
      targetPh: 6.0 as PH,
      solutionVolumeL: 10,
      phAdjusterType: "base",
      adjusterConcentration: 25,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Using base to lower pH is unusual");
  });

  it("acid calculation for extreme pH difference", () => {
    const result = calculatePhAdjustment({
      currentPh: 10.0 as PH,
      targetPh: 5.0 as PH,
      solutionVolumeL: 1,
      phAdjusterType: "acid",
      adjusterConcentration: 80,
    });
    expect(result.adjusterVolumeMl).toBeGreaterThan(0.1);
    expect(result.adjusterVolumeMl).toBeLessThan(100);
  });

  it("base calculation for extreme pH difference", () => {
    const result = calculatePhAdjustment({
      currentPh: 4.0 as PH,
      targetPh: 9.0 as PH,
      solutionVolumeL: 1,
      phAdjusterType: "base",
      adjusterConcentration: 25,
    });
    expect(result.adjusterVolumeMl).toBeGreaterThan(0.1);
    expect(result.adjusterVolumeMl).toBeLessThan(100);
  });
});
