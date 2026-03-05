export type {
  EC,
  PH,
  Percentage,
  Nutrient,
  MixTarget,
  StockSolution,
  MixResult,
  CompatibilityResult,
  CalculatorConfig,
} from "./types.js";

export { getNutrientById, getAllNutrients } from "./nutrients.js";
export { checkCompatibility as checkNutrientCompatibility } from "./nutrients.js";
export {
  checkCompatibility as checkStockCompatibility,
  calculateMix,
} from "./mixer.js";