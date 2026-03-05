import * as os from 'os';
import * as path from 'path';
import type { EC, MixResult, MixTarget, PH, StockSolution, CompatibilityResult, CalculatorConfig } from './types.js';
import { getNutrientById } from './nutrients.js';

interface NutrientData {
  readonly ecPerGram: EC;
  readonly n?: number;
  readonly p?: number;
  readonly k?: number;
  readonly ca?: number;
  readonly mg?: number;
  readonly s?: number;
  readonly incompatibleWith?: readonly string[];
}

const NUTRIENT_DB: Readonly<Record<string, NutrientData>> = {
  'calcium-nitrate': {
    ecPerGram: 0.74 as EC,
    n: 11.9,
    ca: 16.9,
  },
  'magnesium-sulfate': {
    ecPerGram: 0.85 as EC,
    mg: 9.9,
    s: 13.0,
  },
  'single-superphosphate': {
    ecPerGram: 0.5 as EC,
    p: 7.2,
    ca: 10.5,
  },
} as const;

/**
 * Check chemical compatibility between multiple stock solutions.
 * @param stockSolutions - Array of stock solution definitions
 * @returns Compatibility result with any incompatibilities listed
 * @example
 * const result = checkCompatibility([stockA, stockB]);
 */
export function checkCompatibility(stockSolutions: readonly StockSolution[]): CompatibilityResult {
  const presentNutrients = new Set<string>();
  const incompatibilities: string[] = [];

  for (const stock of stockSolutions) {
    for (const constituent of stock.constituents) {
      const nutrient = NUTRIENT_DB[constituent.nutrientId];
      if (!nutrient) continue;

      for (const existingId of presentNutrients) {
        const existing = NUTRIENT_DB[existingId];
        if (existing?.incompatibleWith?.includes(constituent.nutrientId) ||
            nutrient.incompatibleWith?.includes(existingId)) {
          incompatibilities.push(`${existingId} <-> ${constituent.nutrientId}`);
        }
      }
      presentNutrients.add(constituent.nutrientId);
    }
  }

  return {
    compatible: incompatibilities.length === 0,
    incompatibilities,
  };
}

/**
 * Calculate dilution ratios to achieve target EC and nutrient concentrations.
 * @param target - Desired EC and optional pH target
 * @param stocks - Available stock solutions
 * @param config - Calculator configuration (temperature, rounding precision)
 * @returns Mix result with dilution ratios, final concentrations, and warnings
 * @throws {Error} If no stocks provided, EC target invalid, or target exceeds achievable EC
 * @example
 * const result = calculateMix({ ecTarget: 2.0 }, stocks);
 */
export function calculateMix(
  target: MixTarget,
  stocks: readonly StockSolution[],
  config: CalculatorConfig = {},
): MixResult {
  const { roundingDecimals = 3 } = config;
  const warnings: string[] = [];
  const round = (value: number): number => Number(value.toFixed(roundingDecimals));

  if (stocks.length === 0) {
    throw new Error('At least one stock solution required');
  }
  if (target.ecTarget <= 0) {
    throw new RangeError('EC target must be positive');
  }

  const compatibility = checkCompatibility(stocks);
  if (!compatibility.compatible) {
    warnings.push(`Chemical incompatibilities detected: ${compatibility.incompatibilities.join(', ')}`);
  }

  let totalMaxEc = 0;
  const stockContributions = stocks.map(stock => {
    let maxEc = 0;
    for (const constituent of stock.constituents) {
      const nutrient = NUTRIENT_DB[constituent.nutrientId];
      if (!nutrient) {
        throw new Error(`Unknown nutrient: ${constituent.nutrientId}`);
      }
      maxEc += (constituent.gramsPerLiter * nutrient.ecPerGram) / stock.dilutionFactor;
    }
    totalMaxEc += maxEc;
    return { stock, maxEc };
  });

  if (totalMaxEc < target.ecTarget) {
    throw new Error(`EC target ${target.ecTarget} mS/cm exceeds maximum achievable ${round(totalMaxEc)}`);
  }

  const dilutionFactor = target.ecTarget / totalMaxEc;
  const dilutionRatios: Record<string, number> = {};
  const finalConcentrations = { n: 0, p: 0, k: 0, ca: 0, mg: 0, s: 0 };

  for (const { stock, maxEc } of stockContributions) {
    const ratio = dilutionFactor * (maxEc / target.ecTarget);
    dilutionRatios[stock.id] = round(ratio);

    for (const constituent of stock.constituents) {
      const nutrient = NUTRIENT_DB[constituent.nutrientId];
      const concentration = (constituent.gramsPerLiter * ratio) / stock.dilutionFactor;
      
      finalConcentrations.n += (nutrient.n ?? 0) * concentration;
      finalConcentrations.p += (nutrient.p ?? 0) * concentration;
      finalConcentrations.k += (nutrient.k ?? 0) * concentration;
      finalConcentrations.ca += (nutrient.ca ?? 0) * concentration;
      finalConcentrations.mg += (nutrient.mg ?? 0) * concentration;
      finalConcentrations.s += (nutrient.s ?? 0) * concentration;
    }
  }

  const roundedConcentrations = {
    n: round(finalConcentrations.n),
    p: round(finalConcentrations.p),
    k: round(finalConcentrations.k),
    ca: round(finalConcentrations.ca),
    mg: round(finalConcentrations.mg),
    s: round(finalConcentrations.s),
  };

  if (target.phTarget && (target.phTarget < 4 || target.phTarget > 9)) {
    warnings.push('Target pH outside recommended hydroponic range (5.5-6.5)');
  }

  return {
    dilutionRatios,
    finalConcentrations: roundedConcentrations,
    ecEstimate: round(target.ecTarget) as EC,
    warnings,
  };
}