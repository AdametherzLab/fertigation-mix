import type { Nutrient, CompatibilityResult } from "./types.js";

/**
 * Predefined nutrient database with common hydroponic fertilizers.
 * Each entry includes elemental composition, EC contribution, solubility, and incompatibilities.
 */
const predefinedNutrients = [
  {
    id: "calcium-nitrate",
    name: "Calcium Nitrate",
    chemicalComposition: "Ca(NO3)2",
    n: 11.9,
    ca: 16.9,
    ecPerGram: 0.72,
    solubility: 1200,
    incompatibleWith: ["magnesium-sulfate", "monopotassium-phosphate"],
  },
  {
    id: "potassium-nitrate",
    name: "Potassium Nitrate",
    chemicalComposition: "KNO3",
    n: 13.9,
    k: 38.7,
    ecPerGram: 0.65,
    solubility: 316,
    incompatibleWith: [],
  },
  {
    id: "monopotassium-phosphate",
    name: "Monopotassium Phosphate",
    chemicalComposition: "KH2PO4",
    p: 22.8,
    k: 28.7,
    ecPerGram: 0.55,
    solubility: 226,
    incompatibleWith: ["calcium-nitrate", "magnesium-sulfate"],
  },
  {
    id: "magnesium-sulfate",
    name: "Magnesium Sulfate",
    chemicalComposition: "MgSO4-7H2O",
    mg: 9.9,
    s: 13.0,
    ecPerGram: 0.38,
    solubility: 710,
    incompatibleWith: ["calcium-nitrate", "monopotassium-phosphate"],
  },
  {
    id: "potassium-sulfate",
    name: "Potassium Sulfate",
    chemicalComposition: "K2SO4",
    k: 44.9,
    s: 18.4,
    ecPerGram: 0.43,
    solubility: 120,
    incompatibleWith: ["calcium-nitrate"],
  },
  {
    id: "single-superphosphate",
    name: "Single Superphosphate",
    chemicalComposition: "Ca(H2PO4)2-H2O + CaSO4",
    p: 7.2,
    ca: 18.0,
    s: 12.0,
    ecPerGram: 0.28,
    solubility: 25,
    incompatibleWith: ["calcium-nitrate"],
  },
  {
    id: "calcium-chloride",
    name: "Calcium Chloride",
    chemicalComposition: "CaCl2",
    ca: 36.1,
    ecPerGram: 1.0,
    solubility: 745,
    incompatibleWith: [],
  },
  {
    id: "iron-chelate-edta",
    name: "Iron Chelate EDTA",
    chemicalComposition: "Fe-EDTA",
    fe: 13.0,
    ecPerGram: 0.2,
    solubility: 50,
    incompatibleWith: [],
  },
  {
    id: "ammonium-nitrate",
    name: "Ammonium Nitrate",
    chemicalComposition: "NH4NO3",
    n: 35.0,
    ecPerGram: 0.83,
    solubility: 1870,
    incompatibleWith: [],
  },
  {
    id: "potassium-chloride",
    name: "Potassium Chloride",
    chemicalComposition: "KCl",
    k: 52.4,
    ecPerGram: 0.87,
    solubility: 344,
    incompatibleWith: [],
  },
  {
    id: "urea",
    name: "Urea",
    chemicalComposition: "CO(NH2)2",
    n: 46.0,
    ecPerGram: 0.01,
    solubility: 1080,
    incompatibleWith: [],
  },
] as const satisfies readonly Nutrient[];

// Storage for custom nutrients registered at runtime
const customNutrients = new Map<string, Nutrient>();

/**
 * Register a custom nutrient definition.
 * Custom nutrients are stored separately from predefined nutrients and persist
 * for the lifetime of the application unless cleared.
 * 
 * @param nutrient - The nutrient definition to register
 * @throws {Error} If a nutrient with the same ID already exists (predefined or custom)
 * @example
 * registerNutrient({
 *   id: "custom-calcium",
 *   name: "Custom Calcium Source",
 *   chemicalComposition: "CaX2",
 *   ca: 30.0,
 *   ecPerGram: 0.5,
 *   solubility: 500,
 *   incompatibleWith: []
 * });
 */
export function registerNutrient(nutrient: Nutrient): void {
  if (predefinedNutrients.some(n => n.id === nutrient.id)) {
    throw new Error(`Cannot override predefined nutrient: ${nutrient.id}`);
  }
  if (customNutrients.has(nutrient.id)) {
    throw new Error(`Custom nutrient already registered: ${nutrient.id}`);
  }
  customNutrients.set(nutrient.id, nutrient);
}

/**
 * Unregister a custom nutrient by ID.
 * Predefined nutrients cannot be unregistered.
 * 
 * @param id - The ID of the custom nutrient to remove
 * @returns true if removed, false if not found or if it's a predefined nutrient
 * @example
 * unregisterNutrient("custom-calcium");
 */
export function unregisterNutrient(id: string): boolean {
  if (predefinedNutrients.some(n => n.id === id)) {
    return false;
  }
  return customNutrients.delete(id);
}

/**
 * Clear all custom nutrient definitions.
 * This removes all nutrients registered via registerNutrient().
 * Predefined nutrients are unaffected.
 * 
 * @example
 * clearCustomNutrients();
 */
export function clearCustomNutrients(): void {
  customNutrients.clear();
}

/**
 * Retrieve a nutrient by its unique identifier.
 * Checks predefined nutrients first, then custom nutrients.
 * @param id - Nutrient ID to lookup (case-sensitive)
 * @returns Nutrient object or undefined if not found
 * @example
 * const calciumNitrate = getNutrientById('calcium-nitrate');
 */
export function getNutrientById(id: string): Nutrient | undefined {
  const predefined = predefinedNutrients.find((nutrient) => nutrient.id === id);
  if (predefined) return predefined;
  return customNutrients.get(id);
}

/**
 * Get all defined nutrients in the database.
 * @returns Readonly array of all nutrients (predefined + custom)
 * @example
 * const allNutrients = getAllNutrients();
 */
export function getAllNutrients(): readonly Nutrient[] {
  return [...predefinedNutrients, ...customNutrients.values()];
}

/**
 * Check compatibility between multiple nutrients in a mixture.
 * @param nutrientIds - Array of nutrient IDs to check
 * @returns Compatibility result with incompatibility messages
 * @throws {Error} If any nutrient ID is invalid
 * @example
 * const result = checkCompatibility(['calcium-nitrate', 'magnesium-sulfate']);
 * // Returns { compatible: false, incompatibilities: [...] }
 */
export function checkCompatibility(nutrientIds: readonly string[]): CompatibilityResult {
  const seenPairs = new Set<string>();
  const incompatibilities: string[] = [];
  const nutrients = nutrientIds.map((id) => {
    const nutrient = getNutrientById(id);
    if (!nutrient) throw new Error(`Invalid nutrient ID: ${id}`);
    return nutrient;
  });

  for (const nutrient of nutrients) {
    for (const incompatibleId of nutrient.incompatibleWith ?? []) {
      if (nutrientIds.includes(incompatibleId)) {
        const otherNutrient = getNutrientById(incompatibleId);
        if (!otherNutrient) continue;

        const sortedIds = [nutrient.id, incompatibleId].sort();
        const pairKey = sortedIds.join(":");
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          incompatibilities.push(
            `${nutrient.name} cannot be mixed with ${otherNutrient.name}`
          );
        }
      }
    }
  }

  return {
    compatible: incompatibilities.length === 0,
    incompatibilities: incompatibilities,
  };
}
