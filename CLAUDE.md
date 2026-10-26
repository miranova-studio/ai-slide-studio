# CLAUDE.md

## Goal

FRAME is a browser-based slide editor. Preserve JSON import/export compatibility, IndexedDB persistence, presentation, and print output when changing the UI.

## Source of truth

- `src/schema/slide-deck.schema.json`: canonical external interchange format
- `docs/slide-schema.md`: coordinates, field meanings, and PowerPoint mapping
- `src/types.ts`: TypeScript types matching the schema
- `src/schema/validate.ts`: validation and `schemaVersion` migration dispatch
- `src/services/storage.ts`: IndexedDB access and one-time legacy LocalStorage migration
- `src/services/ai/adapter.ts`: future server-side AI integration boundary; currently mock
- `src/App.tsx`: editor, import/export, and shared slide renderer
- `src/styles.css`: templates and print CSS

## Change sequence

1. Change the JSON Schema and TypeScript types together. Add migration logic when the persisted shape changes.
2. Update the renderer, editor controls, default deck, import/export, and print output for each new element field.
3. Run `npm run typecheck` and `npm run build`, then verify a JSON round trip and Japanese PDF print.
4. Record unresolved work in `TODO.md`.

Keep provider credentials on a backend. Browser `VITE_` variables are public. The print path uses `window.print()` and vector text; preserve print CSS whenever slide rendering changes.
