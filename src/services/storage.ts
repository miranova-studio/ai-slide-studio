import { openDB } from "idb";
import { defaultDeck } from "../data/defaultDeck";
import { migrateDeck } from "../schema/validate";
import type { Deck } from "../types";

const DB_NAME = "frame-slide-studio";
const STORE = "decks";
const ACTIVE_KEY = "active";
const LEGACY_KEY = "frame-slide-deck-v1";

const database = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
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
