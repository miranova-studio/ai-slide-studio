# Slide JSON schema (v2)

The canonical file is [`src/schema/slide-deck.schema.json`](../src/schema/slide-deck.schema.json). Import and export use the same `Deck` object. Import validates the JSON Schema before displaying or saving it. Every edit is stored in IndexedDB as this object.

## Canvas and coordinates

`canvas` is fixed at `{ "width": 13.333, "height": 7.5, "unit": "in" }`, the 16:9 wide-slide layout used by PowerPoint. Each element has numeric `x`, `y`, `width`, and `height` in these canvas units, measured from the top-left corner. The element must fit entirely inside the canvas. Element order in the `elements` array is its stacking order; later elements appear above earlier ones.

For `pptxgenjs`, pass the geometry values directly to `slide.addText`, `slide.addImage`, or `slide.addShape` after mapping the element-specific fields. `fontSize` is in points. Colors are CSS color strings in the browser; a PPTX exporter should normalize them to RGB hex. Image `src` is a PNG, JPEG, or WebP data URL, so the JSON is self-contained; a PPTX exporter may need to convert WebP to PNG first.

## Root

| Field           | Meaning                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| `schemaVersion` | Required integer. Current value: `2`.                                       |
| `id`, `title`   | Presentation identifier and display name.                                   |
| `template`      | `paper`, `ink`, or `signal`. Applies the background and default text color. |
| `canvas`        | Fixed wide-slide geometry above.                                            |
| `slides`        | Non-empty ordered list of slides.                                           |
| `updatedAt`     | ISO 8601 date-time string.                                                  |

Each slide has `id`, ordered `elements`, `hidden` (boolean), and `notes` (array). Hidden slides remain editable and in JSON but are excluded from presentation and PDF output. All elements require `id`, `type`, `x`, `y`, `width`, `height`, and `style`.

Each note has `id`, `kind` (`revision`, `question`, or `memo`), non-empty `text`, `completed` (boolean), and ISO 8601 `createdAt`. Notes are attached to a slide and are never printed.

| `type`  | Required content                       | `style` fields                                                                                  |
| ------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `text`  | `text` (plain string)                  | `fontSize` (pt); optional `fontFamily`, `color`, `bold`, `align`, `verticalAlign`, `lineHeight` |
| `image` | `src` (image data URL); optional `alt` | optional `fit`, `opacity`, `borderRadius`                                                       |
| `shape` | `shape` (`rect` or `ellipse`)          | `fill`; optional `stroke`, `strokeWidth`, `opacity`                                             |

## Minimal example

```json
{
  "schemaVersion": 2,
  "id": "demo-001",
  "title": "日本語スライド",
  "template": "paper",
  "canvas": { "width": 13.333, "height": 7.5, "unit": "in" },
  "updatedAt": "2026-10-27T00:00:00.000Z",
  "slides": [
    {
      "id": "slide-001",
      "hidden": false,
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

`src/schema/validate.ts` contains `migrateDeck(input)`, the single version-dispatch entry point. It validates v2 documents, converts v1 documents by adding `hidden: false` and `notes: []`, and converts the unversioned deck from the first MVP (`eyebrow`, `title`, `body`, `image`) into v2 elements. Unknown future versions fail with a clear error. When introducing v3, add a dedicated migration there and test both import and IndexedDB loading. The old LocalStorage key is read once for migration into IndexedDB; it is left intact as a backup.
