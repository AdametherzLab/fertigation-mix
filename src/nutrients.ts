import type { Nutrient, CompatibilityResult } from "./types.js";

/**
 * Predefined nutrient database with common hydroponic fertilizers.
 * Each entry includes elemental composition, EC contribution, solubility, and incompatibilities.
 */
const predefinedNutrients = [
  {
    id: "calcium-nitrate",
    name: "Calcium Nitrate",
    chemicalComposition: "Ca(NO₃)₂",
    n: 11.9,
    ca: 16.9,
    ecPerGram: 0.72,
    solubility: 1200,
    incompatibleWith: ["magnesium-sulfate", "monopotassium-phosphate"],
  },
  {
    id: "potassium-nitrate",
    name: "Potassium Nitrate",
    chemicalComposition: "KNO₃",
    n: 13.9,
    k: 38.7,
    ecPerGram: 0.65,
    solubility: 316,
    incompatibleWith: [],
  },
  {
    id: "monopotassium-phosphate",
    name: "Monopotassium Phosphate",
    chemicalComposition: "KH₂PO₄",
    p: 22.8,
    k: 28.7,
    ecPerGram: 0.55,
    solubility: 226,
    incompatibleWith: ["calcium-nitrate", "magnesium-sulfate"],
  },
  {
    id: "magnesium-sulfate",
    name: "Magnesium Sulfate",
    chemicalComposition: "MgSO₄·7H₂O",
    mg: 9.9,
    s: 13.0,
    ecPerGram: 0.38,
    solubility: 710,
    incompatibleWith: ["calcium-nitrate", "monopotassium-phosphate"],
  },
  {
    id: "potassium-sulfate",
    name: "Potassium Sulfate",
    chemicalComposition: "K₂SO₄",
    k: 44.9,
    s: 18.4,
    ecPerGram: 0.43,
    solubility: 120,
    incompatibleWith: ["calcium-nitrate"],
  },
  {
    id: "single-superphosphate",
    name: "Single Superphosphate",
    chemicalComposition: "Ca(H₂PO₄)₂·H₂O + CaSO₄",
    p: 7.2,
    ca: 18.0,
    s: 12.0,
    ecPerGram: 0.28,
    solubility: 25,
    incompatibleWith: ["calcium-nitrate"],
  },
] as const satisfies readonly Nutrient[];

/**
 * Retrieve a nutrient by its unique identifier.
 * @param id - Nutrient ID to lookup (case-sensitive)
 * @returns Nutrient object or undefined if not found
 * @example
 * const calciumNitrate = getNutrientById('calcium-nitrate');
 */
export function getNutrientById(id: string): Nutrient | undefined {
  return predefinedNutrients.find((nutrient) => nutrient.id === id);
}

/**
 * Get all defined nutrients in the database.
 * @returns Readonly array of all nutrients (prevents mutation)
 * @example
 * const allNutrients = getAllNutrients();
 */
export function getAllNutrients(): readonly Nutrient[] {
  return predefinedNutrients;
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