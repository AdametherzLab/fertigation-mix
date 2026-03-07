# fertigation-mix

**[Live Demo](https://che0md.tech/fertigation-mix)**

[![CI](https://github.com/AdametherzLab/fertigation-mix/actions/workflows/ci.yml/badge.svg)](https://github.com/AdametherzLab/fertigation-mix/actions) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Complete tissue culture and hydroponics toolkit. Step-by-step walkthrough for beginners, nutrient calculators, equipment guides, and sterilization protocols.

## Features
- **Nutrient Calculators**: Calculate exact fertilizer mixes for target EC/pH
- **Sterilization Protocols**: Customizable sterilization steps based on plant type
- **Equipment Guides**: Budget-conscious setup recommendations
- **Troubleshooting Database**: Diagnose common tissue culture problems

## Installation
```bash
bun add fertigation-mix
# or
npm install fertigation-mix
```

## Usage
Calculate required stock solution volumes:
```typescript
import { calculateStockVolumes } from 'fertigation-mix';

const stocks = [
  {
    id: 'calcium-nitrate',
    dilutionFactor: 100,
    constituents: [{ nutrientId: 'calcium-nitrate', gramsPerLiter: 100 }]
  }
];

const result = calculateStockVolumes(
  { ecTarget: 1.5, totalVolumeLiters: 10 },
  stocks
);

console.log(`Stock volumes: ${JSON.stringify(result.stockVolumes)}`);
console.log(`Water needed: ${result.waterVolume}ml`);
```

## Development
```bash
git clone https://github.com/AdametherzLab/fertigation-mix
cd fertigation-mix
bun install
bun test
```

## License
MIT © AdametherzLab
