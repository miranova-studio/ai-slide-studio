# Slide JSON schema (v5)

The canonical file is [`src/schema/slide-deck.schema.json`](../src/schema/slide-deck.schema.json). Import and export use the same `Deck` object. Import validates the JSON Schema before displaying or saving it. Every edit is stored in IndexedDB as this object.

## Canvas and coordinates

`canvas` is fixed at `{ "width": 13.333, "height": 7.5, "unit": "in" }`, the 16:9 wide-slide layout used by PowerPoint. Each element has numeric `x`, `y`, `width`, and `height` in these canvas units, measured from the top-left corner. The element must fit entirely inside the canvas. Element order in the `elements` array is its stacking order; later elements appear above earlier ones.

For `pptxgenjs`, pass the geometry values directly to `slide.addText`, `slide.addImage`, or `slide.addShape` after mapping the element-specific fields. `fontSize` is in points. Colors are CSS color strings in the browser; a PPTX exporter should normalize them to RGB hex. Image `src` is a PNG, JPEG, or WebP data URL, so the JSON is self-contained; a PPTX exporter may need to convert WebP to PNG first.

## Root

| Field            | Meaning                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| `schemaVersion`  | Required integer. Current value: `5`.                                                 |
| `mode`           | `deck` or `course`; see [course-schema.md](course-schema.md) for course fields.       |
| `id`, `title`    | Presentation identifier and display name.                                             |
| `template`       | Legacy template identifier (`paper`, `ink`, or `signal`); retained for compatibility. |
| `themeId`        | ID of a theme JSON file or imported custom theme.                                     |
| `palette`        | Effective HEX colors: `background`, `main`, `accent`, `text`.                         |
| `paletteId`      | Optional selected MIRANOVA palette ID.                                                |
| `paletteMapping` | Source color assignment for background/main/accent (`base`, `sub`, or `accent`).      |
| `canvas`         | Fixed wide-slide geometry above.                                                      |
| `slides`         | Non-empty ordered list of slides.                                                     |
| `masterElements` | Shared elements rendered behind each slide's contents.                                |
| `updatedAt`      | ISO 8601 date-time string.                                                            |

Each slide has `id`, ordered `elements`, `hidden` (boolean), `showMaster` (boolean), `notes` (array), and `narration` (string). Optional `audio` stores audio metadata; the binary resides in IndexedDB. Hidden slides remain editable and in JSON but are excluded from presentation and PDF output. `showMaster: false` suppresses shared master elements on that slide. Master elements are edited once in master-edit mode and appear on all slides with `showMaster: true`. All elements require `id`, `type`, `x`, `y`, `width`, `height`, and `style`.

Each note has `id`, `kind` (`revision`, `question`, or `memo`), non-empty `text`, `completed` (boolean), and ISO 8601 `createdAt`. Notes are attached to a slide and are never printed.

| `type`  | Required content                                                      | `style` fields                                                                                  |
| ------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `text`  | `text` (plain string)                                                 | `fontSize` (pt); optional `fontFamily`, `color`, `bold`, `align`, `verticalAlign`, `lineHeight` |
| `image` | `src` (image data URL); optional `alt`                                | optional `fit`, `opacity`, `borderRadius`                                                       |
| `shape` | `shape` (`rect`, `roundRect`, `ellipse`, `triangle`, `line`, `arrow`) | `fill`; optional `stroke`, `strokeWidth`, `opacity`                                             |

`line` uses its stroke color for the visible line; `arrow` uses stroke for its outline and fill for its body. `strokeWidth` is 0–20. A future PPTX exporter can map `roundRect` to the rounded-rectangle shape and `arrow` to `rightArrow`; confirm the exact `pptxgenjs` shape constants at implementation time.

## Minimal example

```json
{
  "schemaVersion": 5,
  "mode": "deck",
  "id": "demo-001",
  "title": "日本語スライド",
  "template": "paper",
  "themeId": "business",
  "palette": {
    "background": "#F6F9FF",
    "main": "#2454E8",
    "accent": "#F7A23B",
    "text": "#17233E"
  },
  "paletteMapping": { "background": "base", "main": "sub", "accent": "accent" },
  "masterElements": [],
  "canvas": { "width": 13.333, "height": 7.5, "unit": "in" },
  "updatedAt": "2026-10-27T00:00:00.000Z",
  "slides": [
    {
      "id": "slide-001",
      "hidden": false,
      "showMaster": true,
      "narration": "",
      "notes": [],
      "elements": [
        {
          "id": "title-001",
          "type": "text",
          "x": 1,
          "y": 2.2,
          "width": 10,
          "height": 1.4,
          "text": "伝わる資料を作る",
          "style": { "fontSize": 42, "bold": true }
        }
      ]
    }
  ]
}
```

## Version migration

`src/schema/validate.ts` contains `migrateDeck(input)`, the single version-dispatch entry point. It validates v5 documents. v4 gains `mode: "deck"` and empty slide narration. v3 gains `themeId`, effective `palette`, and `paletteMapping`; v2 additionally gains shared `masterElements` and `showMaster: true` on each slide. v1 also gains `hidden: false` and `notes: []`. Unversioned MVP decks (`eyebrow`, `title`, `body`, `image`) migrate directly to v5. Unknown future versions fail clearly. The old LocalStorage key is read once for migration into IndexedDB; it remains as a backup.
