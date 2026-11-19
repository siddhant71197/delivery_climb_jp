# JP-DK: Delivery Climb

A Donkey Kong-style climbing platformer, built as a brand-modular ad unit. A delivery rider
climbs a tower of girders, collects every charm (お守り), dodges the drums (太鼓) the big monkey
(大ザル) rolls down, and reaches the customer at the top before the delivery clock runs out.

The skin is brand-neutral and Japanese-themed. It names no real company or product.

Vanilla TypeScript, one `<canvas>`, Vite. **Zero runtime dependencies.**

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # typecheck, brand gate, level validation, bundle
```

| script | what it does |
| --- | --- |
| `npm run dev` | dev server, with the brand plugin live-reloading on `brands/` edits |
| `npm run check` | `tsc --noEmit` |
| `npm run check:brand` | the brand gate |
| `npm run validate` | static solvability check on every level |
| `npm run simulate` | headless bot plays the levels and reports clear times |
| `npm run brands` | list the brand slugs on disk |

`?level=N` and `?seed=N` boot straight into a level with a fixed RNG seed.

## Brands

All brand values live in `brands/jp-dk/brand.ts`, with artwork in `brands/jp-dk/public/brand/`.
To make a different skin, copy that directory to `brands/<slug>/`, edit the values, and run:

```bash
BRAND=<slug> npm run dev
BRAND=<slug> npm run build
```

Nothing under `src/` changes. `npm run check:brand` enforces that contract.
