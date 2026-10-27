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

## Current UI and data contract

- The left panel switches between a title outline and thumbnails. The center switches between single-slide, draggable grid, and vertical scroll views. The right panel switches between element editing and per-slide notes.
- Slide `hidden` and `notes` are persisted in schema v2. Presentation and print use only `!hidden` slides; editing and JSON export keep every slide. The view tabs and selected slide are transient UI state.
- `migrateDeck` accepts v1 and unversioned decks. New interchange fields must update the schema, types, migration, docs, and example JSON together.
- Business UI colors are defined as `--ui-*` variables in `src/styles.css`. Slide template colors are separate from workspace UI colors.

## Change sequence

1. Change the JSON Schema and TypeScript types together. Add migration logic when the persisted shape changes.
2. Update the renderer, editor controls, default deck, import/export, and print output for each new element field.
3. Run `npm run typecheck`, `npm run check:schema`, and `npm run build`, then verify a JSON round trip and Japanese PDF print. Check hidden-slide exclusion for presentation and print.
4. Record unresolved work in `TODO.md`.

Keep provider credentials on a backend. Browser `VITE_` variables are public. The print path uses `window.print()` and vector text; preserve print CSS whenever slide rendering changes.
