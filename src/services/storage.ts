import { openDB } from "idb";
import { defaultDeck } from "../data/defaultDeck";
import { migrateDeck } from "../schema/validate";
import type { Deck } from "../types";
import type { Theme } from "../themes";

const DB_NAME = "frame-slide-studio";
const STORE = "decks";
const ACTIVE_KEY = "active";
const LEGACY_KEY = "frame-slide-deck-v1";

const THEMES_STORE = "themes";
const AUDIO_STORE = "audio";
const database = openDB(DB_NAME, 3, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    if (!db.objectStoreNames.contains(THEMES_STORE))
      db.createObjectStore(THEMES_STORE);
    if (!db.objectStoreNames.contains(AUDIO_STORE))
      db.createObjectStore(AUDIO_STORE);
  },
});

export async function loadDeck(): Promise<Deck> {
  const db = await database;
  const saved = await db.get(STORE, ACTIVE_KEY);
  if (saved) return migrateDeck(saved);
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    const migrated = migrateDeck(JSON.parse(legacy));
    await saveDeck(migrated);
    return migrated;
  }
  return defaultDeck;
}

export async function saveDeck(deck: Deck): Promise<void> {
  const db = await database;
  await db.put(STORE, deck, ACTIVE_KEY);
}

export async function loadCustomThemes(): Promise<Theme[]> {
  const db = await database;
  return db.getAll(THEMES_STORE);
}

export async function saveCustomTheme(theme: Theme): Promise<void> {
  const db = await database;
  await db.put(THEMES_STORE, theme, theme.id);
}

export async function saveAudio(id: string, blob: Blob): Promise<void> {
  const db = await database;
  await db.put(AUDIO_STORE, blob, id);
}

export async function loadAudio(id: string): Promise<Blob | undefined> {
  const db = await database;
  return db.get(AUDIO_STORE, id);
}

export async function deleteAudio(id: string): Promise<void> {
  const db = await database;
  await db.delete(AUDIO_STORE, id);
}
