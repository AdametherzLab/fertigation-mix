// Nutrient database and compatibility
export {
  getNutrientById,
  getAllNutrients,
  checkCompatibility as checkNutrientCompatibility,
  registerNutrient,
  unregisterNutrient,
  clearCustomNutrients,
} from "./nutrients.js";

// Mixer and calculations
export {
  calculateMix,
  calculateStockVolumes,
  checkCompatibility as checkStockCompatibility,
} from "./mixer.js";

// Sterilization (re-exported from sterilization module)
export {
  calculateSterilization,
  calculateAutoclave,
  getSOP,
  getAllSOPs,
  formatSOP,
} from "./sterilization.js";

// Guide and protocols (re-exported from guide module)
export {
  getEquipmentList,
  estimateSetupCost,
  getBeginnerPlants,
  getPlantProtocol,
  getWalkthrough,
  getTroubleshooting,
  getStockSolutionGuides,
  getStockSolutionGuide,
} from "./guide.js";

// Media preparation (re-exported from media module)
export {
  getMediaFormulation,
  getAllMedia,
  getGrowthRegulator,
  getAllGrowthRegulators,
  calculateMediaPreparation,
} from "./media.js";

// Utilities (re-exported from utils module)
export {
  ecToPpm,
  ppmToEc,
  convertUnit,
  calculatePhAdjustment,
} from "./utils.js";

// Type exports
export type {
  Nutrient,
  StockSolution,
  MixTarget,
  MixResult,
  CompatibilityResult,
  EC,
  PH,
  MediaRecipe,
  VolumeMixTarget,
  StockVolumeResult,
  CalculatorConfig,
  Constituent,
  GrowthRegulator,
  SterilizationInput,
  SterilizationResult,
  AutoclaveInput,
  AutoclaveResult,
  SOP,
  EquipmentItem,
  PlantProtocol,
  WalkthroughStep,
  TroubleshootingEntry,
  StockGuide,
} from "./types.js";
