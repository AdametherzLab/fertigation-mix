export {
  getNutrientById,
  getAllNutrients,
  checkCompatibility as checkNutrientCompatibility,
} from './nutrients.js';
export type { Nutrient } from './nutrients.js';

export {
  checkCompatibility as checkStockCompatibility,
  calculateMix,
  calculateStockVolumes,
} from './mixer.js';
export type {
  MixTarget,
  MixResult,
  CompatibilityResult,
  VolumeMixTarget,
  StockVolumeResult,
} from './mixer.js';

export type { EC, PH, MediaRecipe, StockSolution, CalculatorConfig } from './types.js';

// Sterilization exports
export {
  calculateSterilization,
  calculateAutoclave,
  getSOP,
  getAllSOPs,
  formatSOP,
} from './sterilization.js';
export type {
  SterilizationInput,
  SterilizationResult,
  AutoclaveInput,
  AutoclaveResult,
  SOP,
} from './sterilization.js';

// Guide exports
export {
  getEquipmentList,
  estimateSetupCost,
  getBeginnerPlants,
  getPlantProtocol,
  getWalkthrough,
  getTroubleshooting,
  getStockSolutionGuides,
  getStockSolutionGuide,
} from './guide.js';
export type {
  EquipmentItem,
  PlantProtocol,
  WalkthroughStep,
  TroubleshootingEntry,
  StockSolutionGuide,
} from './guide.js';

// Media exports
export {
  getMediaFormulation,
  getAllMedia,
  getGrowthRegulator,
  getAllGrowthRegulators,
  calculateMediaPreparation,
} from './media.js';
export type {
  MediaRecipe,
  GrowthRegulator,
  MediaPreparationInput,
  MediaPreparationResult,
} from './media.js';

// Utility exports
export {
  ecToPpm,
  ppmToEc,
  convertUnit,
  calculatePhAdjustment,
} from './utils.js';
export type { UnitConversion, PhAdjustmentInput, PhAdjustmentResult } from './utils.js';
