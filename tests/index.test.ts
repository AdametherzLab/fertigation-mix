import { describe, it, expect } from "bun:test";
import {
  getNutrientById,
  getAllNutrients,
  checkNutrientCompatibility,
  checkStockCompatibility,
  calculateMix,
  calculateStockVolumes,
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
  type VolumeMixTarget,
  type StockVolumeResult,
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

  it("throws for stock with zero dilution factor", () => {
    const stocks: StockSolution[] = [{
      id: "s1",
      dilutionFactor: 0,
      constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
    }];
    expect(() =>
      calculateMix({ ecTarget: 1.0 as EC }, stocks)
    ).toThrow("invalid dilution factor");
  });
});

// ──────────────────────────────────────────────
// Stock volume calculation tests
// ──────────────────────────────────────────────

describe("calculateStockVolumes", () => {
  it("calculates correct volumes for single stock", () => {
    const stocks: StockSolution[] = [{
      id: "stock1",
      dilutionFactor: 1,
      constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
    }];
    
    const target: VolumeMixTarget = {
      ecTarget: 1.5 as EC,
      totalVolumeLiters: 10
    };
    
    const result = calculateStockVolumes(target, stocks);
    expect(result.stockVolumes.stock1).toBeCloseTo(10000, 0);
    expect(result.waterVolume).toBe(0);
    expect(result.totalVolume).toBe(10000);
  });

  it("distributes volumes across multiple stocks", () => {
    const stocks: StockSolution[] = [
      {
        id: "A",
        dilutionFactor: 100,
        constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }],
      },
      {
        id: "B",
        dilutionFactor: 50,
        constituents: [{ nutrientId: "potassium-nitrate", gramsPerLiter: 50 }],
      }
    ];
    
    const target: VolumeMixTarget = {
      ecTarget: 2.0 as EC,
      totalVolumeLiters: 5
    };
    
    const result = calculateStockVolumes(target, stocks);
    const totalStock = Object.values(result.stockVolumes).reduce((a, b) => a + b, 0);
    expect(totalStock).toBe(5000);
    expect(result.waterVolume).toBe(0);
  });

  it("throws for invalid total volume", () => {
    expect(() =>
      calculateStockVolumes(
        { ecTarget: 1.0 as EC, totalVolumeLiters: -5 },
        [{ id: "s1", dilutionFactor: 1, constituents: [{ nutrientId: "calcium-nitrate", gramsPerLiter: 100 }] }]
      )
    ).toThrow("Total volume must be positive");
  });
});
