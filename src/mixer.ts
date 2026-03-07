import type { EC, MixResult, MixTarget, PH, StockSolution, CompatibilityResult, CalculatorConfig } from './types.js';
import { getNutrientById } from './nutrients.js';

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
      const nutrient = getNutrientById(constituent.nutrientId);
      if (!nutrient) continue;

      for (const existingId of presentNutrients) {
        const existing = getNutrientById(existingId);
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
    throw new Error('At least one stock solution must be provided. Add stock solutions to perform calculations.');
  }
  if (target.ecTarget <= 0) {
    throw new RangeError(`EC target must be a positive number (received ${target.ecTarget})`);
  }

  // Check for duplicate stock IDs
  const stockIds = new Set<string>();
  for (const stock of stocks) {
    if (stockIds.has(stock.id)) {
      throw new Error(`Duplicate stock solution ID: ${stock.id}`);
    }
    stockIds.add(stock.id);
  }

  // Validate stock solution properties
  stocks.forEach((stock) => {
    if (stock.dilutionFactor <= 0) {
      throw new RangeError(`Stock solution '${stock.id}' has invalid dilution factor (${stock.dilutionFactor}). Must be greater than 0.`);
    }
    if (stock.constituents.length === 0) {
      throw new Error(`Stock solution ${stock.id} has no constituents - each stock must contain at least one nutrient.`);
    }
    stock.constituents.forEach((constituent) => {
      if (constituent.gramsPerLiter <= 0) {
        throw new RangeError(`Stock solution ${stock.id} has invalid grams per liter for ${constituent.nutrientId} (must be >0)`);
      }
      if (!getNutrientById(constituent.nutrientId)) {
        throw new Error(`Stock solution ${stock.id} contains unknown nutrient: ${constituent.nutrientId}`);
      }
    });
  });

  // Validate pH target range
  if (target.phTarget !== undefined && (target.phTarget < 0 || target.phTarget > 14)) {
    throw new RangeError(`pH target must be between 0 and 14 (received ${target.phTarget})`);
  }

  const compatibility = checkCompatibility(stocks);
  if (!compatibility.compatible) {
    warnings.push(`Chemical incompatibilities detected: ${compatibility.incompatibilities.join(', ')}`);
  }

  let totalMaxEc = 0;
  const stockContributions = stocks.map(stock => {
    let maxEc = 0;
    for (const constituent of stock.constituents) {
      const nutrient = getNutrientById(constituent.nutrientId);
      if (!nutrient) throw new Error(`Unknown nutrient: ${constituent.nutrientId}`);
      maxEc += (constituent.gramsPerLiter * nutrient.ecPerGram) / stock.dilutionFactor;
    }
    totalMaxEc += maxEc;
    return { stock, maxEc };
  });

  if (totalMaxEc < target.ecTarget) {
    throw new Error(`EC target of ${target.ecTarget} mS/cm cannot be achieved. Maximum possible EC with current stocks is ${round(totalMaxEc)} mS/cm.`);
  }

  const dilutionFactor = target.ecTarget / totalMaxEc;
  const dilutionRatios: Record<string, number> = {};
  const finalConcentrations = { n: 0, p: 0, k: 0, ca: 0, mg: 0, s: 0 };

  for (const { stock, maxEc } of stockContributions) {
    const ratio = dilutionFactor * (maxEc / target.ecTarget);
    dilutionRatios[stock.id] = round(ratio);

    for (const constituent of stock.constituents) {
      const nutrient = getNutrientById(constituent.nutrientId);
      if (!nutrient) continue;
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

  if (target.phTarget && (target.phTarget < 5.5 || target.phTarget > 6.5)) {
    warnings.push('Target pH outside recommended hydroponic range (5.5-6.5)');
  }

  return {
    dilutionRatios,
    finalConcentrations: roundedConcentrations,
    ecEstimate: round(target.ecTarget) as EC,
    warnings,
  };
}

/**
 * Extended mix target including total volume for stock solution calculations.
 */
export interface VolumeMixTarget extends MixTarget {
  /** Total desired volume of final nutrient solution in liters */
  totalVolumeLiters: number;
}

/**
 * Result of stock volume calculation including absolute volumes.
 */
export interface StockVolumeResult extends MixResult {
  /** Volume of each stock solution required in milliliters */
  stockVolumes: Record<string, number>;
  /** Volume of water required in milliliters */
  waterVolume: number;
  /** Total volume of final solution in milliliters */
  totalVolume: number;
}

/**
 * Calculate required stock solution volumes for a target EC/pH and total volume.
 * @param target - Desired EC, optional pH, and total volume
 * @param stocks - Available stock solutions with their dilution factors
 * @param config - Calculator configuration (rounding precision)
 * @returns Mix result with absolute stock volumes, water volume, and total volume
 * @throws {Error} If total volume is invalid or if mix calculation fails
 * @example
 * const result = calculateStockVolumes(
 *   { ecTarget: 2.0, totalVolumeLiters: 100 },
 *   [{ id: 'stock1', dilutionFactor: 100, constituents: [...] }]
 * );
 * // result.stockVolumes = { stock1: 720, ... }
 * // result.waterVolume = 99280
 */
export function calculateStockVolumes(
  target: VolumeMixTarget,
  stocks: readonly StockSolution[],
  config: CalculatorConfig = {},
): StockVolumeResult {
  if (target.totalVolumeLiters <= 0) {
    throw new RangeError(`Total volume must be positive (received ${target.totalVolumeLiters})`);
  }

  const mixResult = calculateMix(target, stocks, config);
  const { roundingDecimals = 0 } = config;
  const round = (value: number) => Number(value.toFixed(roundingDecimals));

  const stockVolumes: Record<string, number> = {};
  let totalStockVolume = 0;

  for (const stock of stocks) {
    const ratio = mixResult.dilutionRatios[stock.id];
    const volumeLiters = ratio * target.totalVolumeLiters;
    const volumeMl = volumeLiters * 1000;
    const roundedVolume = round(volumeMl);
    stockVolumes[stock.id] = roundedVolume;
    totalStockVolume += roundedVolume;
  }

  const totalVolumeMl = target.totalVolumeLiters * 1000;
  const waterVolume = round(totalVolumeMl - totalStockVolume);

  return {
    ...mixResult,
    stockVolumes,
    waterVolume,
    totalVolume: totalVolumeMl,
  };
}
