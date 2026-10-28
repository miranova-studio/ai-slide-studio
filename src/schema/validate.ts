import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import deckSchema from "./slide-deck.schema.json";
import { SCHEMA_VERSION, SLIDE_HEIGHT, SLIDE_WIDTH } from "../types";
import type { Deck, Slide } from "../types";
import { makeMasterElements, makeSlide } from "../data/defaultDeck";
import { DEFAULT_MAPPING, DEFAULT_PALETTE } from "../themes";

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
  if (version === 4) return assertDeck(migrateV4(input));
  if (version === 3) return assertDeck(migrateV4(migrateV3(input)));
  if (version === 2) return assertDeck(migrateV4(migrateV3(migrateV2(input))));
  if (version === 1) return assertDeck(migrateV4(migrateV3(migrateV1(input))));
  if (version === undefined || version === 0)
    return assertDeck(migrateLegacy(input as LegacyDeck));
  throw new Error(`未対応のschemaVersion: ${String(version)}`);
}

function migrateV1(input: unknown): Deck {
  const old = input as Deck;
  if (!Array.isArray(old.slides) || old.slides.length === 0)
    throw new Error("移行できるスライドがありません");
  return migrateV2({
    ...old,
    schemaVersion: 2,
    slides: old.slides.map((slide) => ({
      ...slide,
      hidden: false,
      notes: [],
    })),
  });
}

function migrateV2(input: unknown): Deck {
  const old = input as Deck;
  return {
    ...old,
    schemaVersion: 3,
    masterElements: makeMasterElements(old.template),
    slides: old.slides.map((slide) => ({ ...slide, showMaster: true })),
  } as Deck;
}

function migrateV3(input: unknown): Deck {
  const old = input as Deck;
  const legacyPalettes = {
    paper: {
      background: "#F5F0E5",
      main: "#DC6339",
      accent: "#E15C30",
      text: "#262521",
    },
    ink: {
      background: "#151B24",
      main: "#7EBCFF",
      accent: "#8CC8FF",
      text: "#F4F0E7",
    },
    signal: {
      background: "#F4DB3D",
      main: "#F05237",
      accent: "#F05237",
      text: "#161511",
    },
  };
  return {
    ...old,
    schemaVersion: 4,
    themeId:
      old.template === "ink"
        ? "dark"
        : old.template === "signal"
          ? "pop"
          : "business",
    palette: legacyPalettes[old.template] || DEFAULT_PALETTE,
    paletteMapping: DEFAULT_MAPPING,
  };
}

function migrateV4(input: unknown): Deck {
  const old = input as Deck;
  return {
    ...old,
    schemaVersion: SCHEMA_VERSION,
    mode: "deck",
    slides: old.slides.map((slide) => ({ ...slide, narration: "" })),
  };
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
    mode: "deck",
    id: legacy.id || crypto.randomUUID(),
    title: legacy.title || "Imported deck",
    template: ["paper", "ink", "signal"].includes(legacy.template || "")
      ? legacy.template!
      : "paper",
    themeId: "business",
    palette: DEFAULT_PALETTE,
    paletteMapping: DEFAULT_MAPPING,
    masterElements: makeMasterElements(
      ["paper", "ink", "signal"].includes(legacy.template || "")
        ? legacy.template!
        : "paper",
    ),
    canvas: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, unit: "in" },
    updatedAt: new Date().toISOString(),
    slides: slides.map((slide) => ({ ...slide, showMaster: true })),
  };
}

export function assertDeck(input: unknown): Deck {
  if (!validateSchema(input)) {
    const issue = validateSchema.errors?.[0];
    throw new Error(
      `JSON Schema違反: ${issue?.instancePath || "/"} ${issue?.message || ""}`,
    );
  }
  for (const slide of [{ elements: input.masterElements }, ...input.slides]) {
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
  if (input.mode === "course") {
    const referenced = input.course!.sections.flatMap((section) =>
      section.lectures.flatMap((lecture) => lecture.slideIds),
    );
    const slideIds = input.slides.map((slide) => slide.id);
    if (
      referenced.length !== slideIds.length ||
      new Set(referenced).size !== referenced.length ||
      referenced.some((id) => !slideIds.includes(id))
    )
      throw new Error("講座の目次とスライドIDが一致しません");
  }
  return input;
}
