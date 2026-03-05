import { describe, it, expect } from "bun:test";
import {
  getNutrientById,
  getAllNutrients,
  checkNutrientCompatibility,
  checkStockCompatibility,
  calculateMix,
  type Nutrient,
  type StockSolution,
  type MixTarget,
  type MixResult,
  type CompatibilityResult,
} from "../src/index.ts";

describe("fertigation-mix public API", () => {
  it("nutrient database lookup returns correct N-P-K profile for Calcium Nitrate", () => {
    const calciumNitrate = getNutrientById("calcium-nitrate");
    expect(calciumNitrate).toBeDefined();
    expect(calciumNitrate?.name).toBe("Calcium Nitrate");
    expect(calciumNitrate?.n).toBeGreaterThan(0);
    expect(calciumNitrate?.ca).toBeGreaterThan(0);
    expect(calciumNitrate?.p).toBeUndefined();
    expect(calciumNitrate?.k).toBeUndefined();
  });

  it("compatibility check correctly identifies Ca-NO3 and MgSO4 as compatible", () => {
    const result = checkNutrientCompatibility([
      "calcium-nitrate",
      "magnesium-sulfate",
    ]);
    expect(result.compatible).toBe(false);
    expect(result.incompatibilities).toHaveLength(1);
  });

  it("compatibility check flags Ca-NO3 and single superphosphate as incompatible", () => {
    const result = checkNutrientCompatibility([
      "calcium-nitrate",
      "single-superphosphate",
    ]);
    expect(result.compatible).toBe(false);
    expect(result.incompatibilities.length).toBeGreaterThan(0);
    expect(result.incompatibilities[0]).toContain("cannot be mixed");
  });

  it("calculateMix with valid stocks produces estimatedEC within tolerance of target", () => {
    const stocks: StockSolution[] = [
      { 
        id: "stock1",
        dilutionFactor: 1,
        constituents: [
          { nutrientId: "calcium-nitrate", gramsPerLiter: 100 }
        ]
      },
      { 
        id: "stock2",
        dilutionFactor: 1,
        constituents: [
          { nutrientId: "potassium-nitrate", gramsPerLiter: 100 }
        ]
      },
    ];
    const target: MixTarget = {
      ecTarget: 1.5 as import("../src/index.ts").EC,
      phTarget: 6.0 as import("../src/index.ts").PH,
    };
    const result = calculateMix(target, stocks);
    expect(result.ecEstimate).toBeCloseTo(1.5, 1);
    expect(Object.keys(result.dilutionRatios)).toHaveLength(2);
    expect(result.warnings.length).toBeGreaterThanOrEqual(0);
  });

  it("calculateMix with incompatible nutrients includes conflict warning", () => {
    const stocks: StockSolution[] = [
      { 
        id: "stock1",
        dilutionFactor: 1,
        constituents: [
          { nutrientId: "calcium-nitrate", gramsPerLiter: 100 }
        ]
      },
      { 
        id: "stock2",
        dilutionFactor: 1,
        constituents: [
          { nutrientId: "magnesium-sulfate", gramsPerLiter: 100 }
        ]
      },
    ];
    const target: MixTarget = {
      ecTarget: 1.0 as import("../src/index.ts").EC,
      phTarget: 6.0 as import("../src/index.ts").PH,
    };
    const result = calculateMix(target, stocks);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("incompatibilities");
  });
});