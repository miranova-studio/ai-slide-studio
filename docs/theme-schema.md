# Theme JSON schema (v1)

The source-controlled theme files live in [`themes/`](../themes/). Each file is named `<id>.json`, where `id` is lowercase ASCII letters, digits, and hyphens. Vite loads every `themes/*.json` automatically through `import.meta.glob`; adding a file requires a dev-server refresh or a production rebuild. The canonical validator is [`src/schema/theme.schema.json`](../src/schema/theme.schema.json). Run `npm run check:themes` before committing.

## Fields

| Field                    | Meaning                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `themeVersion`           | Required, currently `1`. This is separate from slide `schemaVersion`.                      |
| `id`, `name`, `category` | Stable file key, display name, category.                                                   |
| `palette`                | HEX colors `background`, `main`, `accent`, `text`.                                         |
| `fonts`                  | CSS font stacks for `heading` and `body`. Include Japanese fallbacks.                      |
| `masterElements`         | Shared decorative shape/image elements in slide coordinates.                               |
| `layouts`                | `title`, `body`, and `image` variants. Each has `eyebrow`, `title`, `body`, `image` boxes. |

Every box uses `{ "x", "y", "width", "height" }` in the 13.333 × 7.5 inch slide coordinate system. Shapes use the same types and style fields as slide shapes. Images use data URLs. The app validates files before loading/importing them. Theme switching repositions existing text and image elements by role while preserving their text, image data, IDs, and notes; existing theme decoration is replaced with the selected theme's master elements. If custom placement should be kept, export the deck before switching themes.

## Minimal example

```json
{
  "themeVersion": 1,
  "id": "sample",
  "name": "サンプル",
  "category": "カスタム",
  "palette": {
    "background": "#FFFFFF",
    "main": "#2454E8",
    "accent": "#F7A23B",
    "text": "#111827"
  },
  "fonts": {
    "heading": "'Noto Sans JP', sans-serif",
    "body": "'Noto Sans JP', sans-serif"
  },
  "masterElements": [],
  "layouts": {
    "title": {
      "eyebrow": { "x": 1, "y": 1.4, "width": 10, "height": 0.4 },
      "title": { "x": 1, "y": 2, "width": 10, "height": 1.8 },
      "body": { "x": 1, "y": 5, "width": 10, "height": 1 },
      "image": { "x": 7.5, "y": 1.5, "width": 4.5, "height": 4.7 }
    },
    "body": {
      "eyebrow": { "x": 1, "y": 1.4, "width": 10, "height": 0.4 },
      "title": { "x": 1, "y": 2, "width": 10, "height": 1.8 },
      "body": { "x": 1, "y": 5, "width": 10, "height": 1 },
      "image": { "x": 7.5, "y": 1.5, "width": 4.5, "height": 4.7 }
    },
    "image": {
      "eyebrow": { "x": 1, "y": 1.4, "width": 6, "height": 0.4 },
      "title": { "x": 1, "y": 2, "width": 6, "height": 1.8 },
      "body": { "x": 1, "y": 5, "width": 6, "height": 1 },
      "image": { "x": 7.5, "y": 1.5, "width": 4.5, "height": 4.7 }
    }
  }
}
```

## MIRANOVA palette mapping

`npm run sync-palettes` fetches the public [`palettes-data.js`](https://miranova-studio.github.io/three-color-palette/palettes-data.js), extracts the `window.ATLAS_PALETTES = [...]` JSON array without executing JavaScript, and atomically replaces `src/data/miranova-palettes.json`. The required source fields are `id`, `name`, `base`, `sub`, and `accent`; additional fields are preserved. On an HTTP, parsing, or validation failure it keeps the previous JSON and exits with an error. The app itself makes no runtime request to the palette site. The bundled snapshot contains 235 palettes (2026-10-31).

Optional `palettePreferences` stores `baseMode` (`original`, `white`, `black`) and `textMode` (`auto`, `white`, `black`). It is included in a saved theme and in a deck. White and black base modes replace the mapped background with `#FFFFFF` or `#000000`. Auto text chooses the higher WCAG contrast of black and white; manual text may fall below 4.5:1 and is shown with a warning.

The default mapping is base → background, sub → main, accent → accent, with Base 70 / Sub 25 / Accent 5 as a design guide. The UI can swap assignments. Text is chosen from black/white by WCAG relative luminance to achieve at least 4.5:1 against the mapped background; headings use `main` only when it also meets 4.5:1.

The browser stores imported/created custom themes in IndexedDB and exports their JSON. Supported browsers can write directly after the user selects the local `themes/` directory. Otherwise, place the exported `<id>.json` in `themes/` manually and rebuild/reload. Theme JSON import/export is separate from deck JSON import/export.
