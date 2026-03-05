// REMOVED external import: import type { ReadonlyDeep } from "type-fest";

/** Electrical conductivity in mS/cm with branded type safety */
export type EC = number & { readonly __brand: "EC" };

/** pH value between 0 and 14 with branded type safety */
export type PH = number & { readonly __brand: "PH" };

/** Percentage value between 0 and 100 with branded type safety */
export type Percentage = number & { readonly __brand: "Percentage" };

/**
 * Fertilizer nutrient profile with element concentrations and EC contribution
 * @example { id: "CaNO3", n: 15, ca: 25, ecPerGram: 0.8 }
 */
export interface Nutrient {
  readonly id: string;
  readonly name: string;
  readonly chemicalComposition?: string;
  readonly n?: Percentage;
  readonly p?: Percentage;
  readonly k?: Percentage;
  readonly ca?: Percentage;
  readonly mg?: Percentage;
  readonly s?: Percentage;
  readonly ecPerGram: EC;
  readonly solubility?: number;
  readonly incompatibleWith?: ReadonlyArray<string>;
}

/**
 * Target parameters for the nutrient solution mix
 * @example { ecTarget: 2.0, phTarget: 6.0, nutrientRatios: { caMg: { min: 2, max: 3 } } }
 */
export interface MixTarget {
  readonly ecTarget: EC;
  readonly phTarget?: PH;
  readonly nutrientRatios?: {
    readonly npk?: { readonly min: number; readonly max: number };
    readonly caMg?: { readonly min: number; readonly max: number };
  };
}

/**
 * Concentrated stock solution definition
 * @example { id: "StockA", dilutionFactor: 100, constituents: [{ nutrientId: "CaNO3", gramsPerLiter: 150 }] }
 */
export interface StockSolution {
  readonly id: string;
  readonly dilutionFactor: number;
  readonly constituents: ReadonlyArray<{
    readonly nutrientId: string;
    readonly gramsPerLiter: number;
  }>;
}

/**
 * Result of nutrient solution calculation
 * @example { dilutionRatios: { StockA: 0.02 }, finalConcentrations: { n: 150 }, ecEstimate: 1.8 }
 */
export interface MixResult {
  readonly dilutionRatios: Readonly<Record<string, number>>;
  readonly finalConcentrations: {
    readonly n: number;
    readonly p: number;
    readonly k: number;
    readonly ca: number;
    readonly mg: number;
    readonly s: number;
  };
  readonly ecEstimate: EC;
  readonly phEstimate?: PH;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Fertilizer compatibility check result
 * @example { compatible: false, incompatibilities: ["Nitrate", "Sulfate"] }
 */
export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly incompatibilities: ReadonlyArray<string>;
}

/**
 * Calculator configuration parameters
 * @example { temperature: 25, roundingDecimals: 2 }
 */
export interface CalculatorConfig {
  readonly temperature?: number;
  readonly roundingDecimals?: number;
}