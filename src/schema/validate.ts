import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import deckSchema from "./slide-deck.schema.json";
import { SCHEMA_VERSION, SLIDE_HEIGHT, SLIDE_WIDTH } from "../types";
import type { Deck, Slide } from "../types";
import { makeSlide } from "../data/defaultDeck";

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validateSchema = ajv.compile<Deck>(deckSchema);

interface LegacySlide {
  id?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  image?: string;
  imageAlt?: string;
}
interface LegacyDeck {
  id?: string;
  title?: string;
  template?: Deck["template"];
  slides?: LegacySlide[];
  updatedAt?: string;
}

/** Version dispatch is the migration entry point for future schema versions. */
export function migrateDeck(input: unknown): Deck {
  if (!input || typeof input !== "object")
    throw new Error("JSONの形式が正しくありません");
  const version = (input as { schemaVersion?: unknown }).schemaVersion;
  if (version === SCHEMA_VERSION) return assertDeck(input);
  if (version === undefined || version === 0)
    return assertDeck(migrateLegacy(input as LegacyDeck));
  throw new Error(`未対応のschemaVersion: ${String(version)}`);
}

function migrateLegacy(legacy: LegacyDeck): Deck {
  if (!Array.isArray(legacy.slides) || legacy.slides.length === 0)
    throw new Error("移行できるスライドがありません");
  const slides: Slide[] = legacy.slides.map((old) => {
    const slide = makeSlide(old.eyebrow ?? "", old.title ?? "", old.body ?? "");
    slide.id = old.id || slide.id;
    if (old.image?.startsWith("data:image/")) {
      slide.elements[1].width = 6.2;
      slide.elements[2].width = 6.2;
      slide.elements.push({
        id: crypto.randomUUID(),
        type: "image",
        x: 7.4,
        y: 1.45,
        width: 4.75,
        height: 4.65,
        src: old.image,
        alt: old.imageAlt,
        style: { fit: "cover" },
      });
    }
    return slide;
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    id: legacy.id || crypto.randomUUID(),
    title: legacy.title || "Imported deck",
    template: ["paper", "ink", "signal"].includes(legacy.template || "")
      ? legacy.template!
      : "paper",
    canvas: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, unit: "in" },
    updatedAt: new Date().toISOString(),
    slides,
  };
}

export function assertDeck(input: unknown): Deck {
  if (!validateSchema(input)) {
    const issue = validateSchema.errors?.[0];
    throw new Error(
      `JSON Schema違反: ${issue?.instancePath || "/"} ${issue?.message || ""}`,
    );
  }
  for (const slide of input.slides) {
    for (const element of slide.elements) {
      if (
        element.x + element.width > SLIDE_WIDTH + 0.001 ||
        element.y + element.height > SLIDE_HEIGHT + 0.001
      ) {
        throw new Error(
          `要素 ${element.id} がキャンバスの外にはみ出しています`,
        );
      }
    }
  }
  return input;
}
