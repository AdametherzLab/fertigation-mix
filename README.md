# fertigation-mix 🌱

[![CI](https://github.com/AdametherzLab/fertigation-mix/actions/workflows/ci.yml/badge.svg)](https://github.com/AdametherzLab/fertigation-mix/actions) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Precision nutrient solution calculator for hydroponics and fertigation systems.** Calculate exact dilution ratios to hit target EC/pH values while tracking N-P-K-Ca-Mg-S concentrations.

## ✨ Features

✅ **EC targeting** – Calculate exact amounts to reach target electrical conductivity  
✅ **Nutrient tracking** – Monitor N, P, K, Ca, Mg, S concentrations in ppm  
✅ **Compatibility checking** – Prevent nutrient lockout before mixing  
✅ **Stock solution support** – Work with concentrated stock solutions  
✅ **TypeScript-first** – Full type safety with zero dependencies  
✅ **Production-ready** – Built for real-world hydroponic systems  

## 📦 Installation

```bash
# npm
npm install @adametherzlab/fertigation-mix

# bun
bun add @adametherzlab/fertigation-mix

# yarn
yarn add @adametherzlab/fertigation-mix
```

## 🚀 Quick Start

```typescript
import {
  getNutrientById,
  checkNutrientCompatibility,
  calculateMix,
  type MixTarget,
  type StockSolution,
} from "@adametherzlab/fertigation-mix";

// Look up nutrients
const calciumNitrate = getNutrientById("CaNO3");
const potassiumNitrate = getNutrientById("KNO3");

// Check compatibility before mixing
const compatibility = checkNutrientCompatibility(["CaNO3", "KNO3"]);
console.log(compatibility.compatible); // true

// Define your stock solution
const stockA: StockSolution = {
  id: "TomatoStock",
  dilutionFactor: 100,
  constituents: [
    { nutrientId: "CaNO3", gramsPerLiter: 150 },
    { nutrientId: "KNO3", gramsPerLiter: 100 },
  ],
};

// Set your target parameters
const target: MixTarget = {
  ecTarget: 2.0,
  phTarget: 6.0,
  nutrientRatios: {
    caMg: { min: 2, max: 3 },
  },
};

// Calculate the mix!
const result = calculateMix([stockA], target);
console.log(result.dilutionRatios); // { TomatoStock: 0.015 }
console.log(result.ecEstimate); // 2.0 mS/cm
```

## 📚 API Reference

### Types

```typescript
/**
 * Fertilizer nutrient profile with element concentrations and EC contribution
 * @example { id: "CaNO3", n: 15, ca: 25, ecPerGram: 0.8 }
 */
interface Nutrient {
  readonly id: string;
  readonly n?: number;      // Nitrogen (%)
  readonly p?: number;      // Phosphorus (%)
  readonly k?: number;      // Potassium (%)
  readonly ca?: number;     // Calcium (%)
  readonly mg?: number;     // Magnesium (%)
  readonly s?: number;      // Sulfur (%)
  readonly ecPerGram: number; // mS/cm per gram per liter
}

/**
 * Target parameters for the nutrient solution mix
 * @example { ecTarget: 2.0, phTarget: 6.0, nutrientRatios: { caMg: { min: 2, max: 3 } } }
 */
interface MixTarget {
  readonly ecTarget: number;      // Target EC in mS/cm
  readonly phTarget?: number;     // Target pH (optional)
  readonly nutrientRatios?: {
    readonly caMg?: { min: number; max: number }; // Ca:Mg ratio range
  };
}

/**
 * Concentrated stock solution definition
 * @example { id: "StockA", dilutionFactor: 100, constituents: [{ nutrientId: "CaNO3", gramsPerLiter: 150 }] }
 */
interface StockSolution {
  readonly id: string;
  readonly dilutionFactor: number; // How many times more concentrated than final
  readonly constituents: ReadonlyArray<{
    readonly nutrientId: string;
    readonly gramsPerLiter: number; // Grams per liter of stock solution
  }>;
}

/**
 * Result of nutrient solution calculation
 * @example { dilutionRatios: { StockA: 0.02 }, finalConcentrations: { n: 150 }, ecEstimate: 1.8 }
 */
interface MixResult {
  readonly dilutionRatios: Record<string, number>; // Stock ID → ratio in final solution
  readonly finalConcentrations: Partial<Record<keyof Omit<Nutrient, "id" | "ecPerGram">, number>>;
  readonly ecEstimate: number; // Estimated EC in mS/cm
  readonly warnings?: string[];
}

/**
 * Fertilizer compatibility check result
 * @example { compatible: false, incompatibilities: ["Nitrate", "Sulfate"] }
 */
interface CompatibilityResult {
  readonly compatible: boolean;
  readonly incompatibilities: string[];
}

/**
 * Calculator configuration parameters
 * @example { temperature: 25, roundingDecimals: 2 }
 */
interface CalculatorConfig {
  readonly temperature?: number;      // °C for EC correction (default: 25)
  readonly roundingDecimals?: number; // Decimal places for results (default: 3)
}
```

### Functions

#### `getNutrientById(id: string): Nutrient | undefined`
```typescript
const nutrient = getNutrientById("CaNO3");
// Returns calcium nitrate nutrient profile
```

#### `getAllNutrients(): ReadonlyArray<Nutrient>`
```typescript
const allNutrients = getAllNutrients();
// Returns array of all available nutrients
```

#### `checkNutrientCompatibility(nutrientIds: ReadonlyArray<string>): CompatibilityResult`
```typescript
const result = checkNutrientCompatibility(["CaNO3", "MgSO4"]);
// Returns { compatible: true, incompatibilities: [] }
```

#### `checkStockCompatibility(stockSolutions: readonly StockSolution[]): CompatibilityResult`
```typescript
const result = checkStockCompatibility([stockA, stockB]);
// Returns compatibility status for all constituents
```

#### `calculateMix(stockSolutions: readonly StockSolution[], target: MixTarget, config?: CalculatorConfig): MixResult`
```typescript
const result = calculateMix([stockA], target, { temperature: 22 });
// Returns exact dilution ratios and final concentrations
```

## 🍅 Advanced Usage: Tomato Nutrient Recipe

```typescript
import {
  getNutrientById,
  checkNutrientCompatibility,
  calculateMix,
  type StockSolution,
  type MixTarget,
} from "@adametherzlab/fertigation-mix";

// Define our nutrient stock solutions
const calciumStock: StockSolution = {
  id: "CalciumStock",
  dilutionFactor: 100,
  constituents: [
    { nutrientId: "CaNO3", gramsPerLiter: 200 }, // Calcium nitrate
  ],
};

const baseStock: StockSolution = {
  id: "BaseStock",
  dilutionFactor: 100,
  constituents: [
    { nutrientId: "KNO3", gramsPerLiter: 150 },   // Potassium nitrate
    { nutrientId: "MKP", gramsPerLiter: 50 },     // Mono-potassium phosphate
    { nutrientId: "MgSO4", gramsPerLiter: 100 },  // Magnesium sulfate
  ],
};

// Check compatibility (calcium and sulfates shouldn't mix in high concentration)
const compatibility = checkNutrientCompatibility([
  "CaNO3", "KNO3", "MKP", "MgSO4"
]);
if (!compatibility.compatible) {
  console.warn("Incompatibilities:", compatibility.incompatibilities);
}

// Target for tomato vegetative stage
const tomatoTarget: MixTarget = {
  ecTarget: 2.2,          // mS/cm
  phTarget: 6.2,
  nutrientRatios: {
    caMg: { min: 2, max: 3 }, // Ca:Mg ratio 2-3:1
  },
};

// Calculate the mix
const mix = calculateMix([calciumStock, baseStock], tomatoTarget, {
  temperature: 24,
  roundingDecimals: 4,
});

console.log("Dilution ratios:");
console.log(`  Calcium stock: ${mix.dilutionRatios.CalciumStock} mL/L`);
console.log(`  Base stock: ${mix.dilutionRatios.BaseStock} mL/L`);

console.log("\nFinal concentrations (ppm):");
console.log(`  N: ${mix.finalConcentrations.n?.toFixed(1)}`);
console.log(`  P: ${mix.finalConcentrations.p?.toFixed(1)}`);
console.log(`  K: ${mix.finalConcentrations.k?.toFixed(1)}`);
console.log(`  Ca: ${mix.finalConcentrations.ca?.toFixed(1)}`);
console.log(`  Mg: ${mix.finalConcentrations.mg?.toFixed(1)}`);

console.log(`\nEstimated EC: ${mix.ecEstimate.toFixed(2)} mS/cm`);
```

## 🧪 How It Works

1. **Calculates total EC contribution** from all nutrients in stock solutions
2. **Solves for dilution ratios** that achieve target EC
3. **Validates nutrient ratios** (like Ca:Mg) stay within specified ranges
4. **Returns precise mL/L amounts** for each stock solution

The built-in nutrient database includes common hydroponic fertilizers with their elemental percentages and EC coefficients.

## ⚠️ Limitations & Notes

- **pH adjustment is not automated** – The calculator provides target pH but doesn't calculate acid/base additions
- **Temperature correction** is applied to EC calculations (default 25°C)
- **Precipitation warnings** are provided for incompatible combinations
- **Only N-P-K-Ca-Mg-S** are tracked – micronutrients are not included in calculations
- **Ideal for recirculating systems** – Drain-to-waste may require different calculations

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and pull request guidelines.

## 📄 License

MIT © [AdametherzLab](https://github.com/AdametherzLab)

---

*Built with precision for the hydroponics community. Happy growing! 🌿*