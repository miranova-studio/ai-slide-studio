/// <reference types="vite/client" />
import Ajv2020 from "ajv/dist/2020";
import themeSchema from "./schema/theme.schema.json";
import type { Deck, ShapeElement, ImageElement, SlideElement, SlideBackground } from "./types";

export interface ThemePalette {
  background: string;
  main: string;
  accent: string;
  text: string;
}
export interface ThemeFonts {
  heading: string;
  body: string;
}
export interface ThemeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ThemeLayout {
  eyebrow: ThemeBox;
  title: ThemeBox;
  body: ThemeBox;
  image: ThemeBox;
}
export interface Theme {
  themeVersion: 1;
  id: string;
  name: string;
  category: string;
  palette: ThemePalette;
  palettePreferences?: PalettePreferences;
  background?: SlideBackground;
  fonts: ThemeFonts;
  masterElements: (ShapeElement | ImageElement)[];
  layouts: { title: ThemeLayout; body: ThemeLayout; image: ThemeLayout };
}
export type PaletteSlot = "base" | "sub" | "accent";
export type PalettePreferences = {
  baseMode: "original" | "white" | "black";
  textMode: "auto" | "white" | "black";
};
export const DEFAULT_PALETTE_PREFERENCES: PalettePreferences = {
  baseMode: "original",
  textMode: "auto",
};
export type PaletteMapping = {
  background: PaletteSlot;
  main: PaletteSlot;
  accent: PaletteSlot;
};
export const DEFAULT_MAPPING: PaletteMapping = {
  background: "base",
  main: "sub",
  accent: "accent",
};
export const DEFAULT_PALETTE: ThemePalette = {
  background: "#F6F9FF",
  main: "#2454E8",
  accent: "#F7A23B",
  text: "#17233E",
};

const ajv = new Ajv2020({ allErrors: true });
const validate = ajv.compile<Theme>(themeSchema);
export function assertTheme(input: unknown): Theme {
  if (!validate(input))
    throw new Error(
      `テーマJSONが不正です: ${validate.errors?.[0]?.instancePath || "/"} ${validate.errors?.[0]?.message || ""}`,
    );
  for (const element of input.masterElements) {
    if (
      element.x + element.width > 13.334 ||
      element.y + element.height > 7.501
    )
      throw new Error(`マスター要素 ${element.id} が範囲外です`);
  }
  for (const [variant, layout] of Object.entries(input.layouts))
    for (const [role, box] of Object.entries(layout)) {
      if (box.x + box.width > 13.334 || box.y + box.height > 7.501)
        throw new Error(`レイアウト ${variant}/${role} が範囲外です`);
    }
  return input;
}

const modules = import.meta.glob("../themes/*.json", {
  eager: true,
  import: "default",
});
export const builtInThemes = Object.values(modules)
  .map(assertTheme)
  .sort((a, b) => a.id.localeCompare(b.id));

function luminance(hex: string) {
  const rgb = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
export function readableText(background: string) {
  const black = "#000000",
    white = "#FFFFFF";
  return contrastRatio(background, black) >= contrastRatio(background, white)
    ? black
    : white;
}
export interface MiranovaPalette {
  id: string;
  name: string;
  category: string;
  base: string;
  sub: string;
  accent: string;
  description?: string;
  tags?: string[];
  purposes?: string[];
  purpose?: string;
  selectionBasis?: string;
  [key: string]: unknown;
}
export function mappedPalette(
  palette: MiranovaPalette,
  mapping: PaletteMapping,
  preferences: PalettePreferences = DEFAULT_PALETTE_PREFERENCES,
): ThemePalette {
  const background = preferences.baseMode === "white" ? "#FFFFFF" : preferences.baseMode === "black" ? "#000000" : palette[mapping.background];
  return {
    background,
    main: palette[mapping.main],
    accent: palette[mapping.accent],
    text: preferences.textMode === "white" ? "#FFFFFF" : preferences.textMode === "black" ? "#000000" : readableText(background),
  };
}
export function applyPaletteToDeck(
  deck: Deck,
  palette: ThemePalette,
  paletteId?: string,
  paletteMapping: PaletteMapping = DEFAULT_MAPPING,
  palettePreferences: PalettePreferences = DEFAULT_PALETTE_PREFERENCES,
): Deck {
  const heading =
    contrastRatio(palette.background, palette.main) >= 4.5
      ? palette.main
      : palette.text;
  return {
    ...deck,
    palette,
    paletteId,
    paletteMapping,
    palettePreferences,
    masterElements: deck.masterElements.map((element, index) =>
      element.type === "shape"
        ? {
            ...element,
            style: {
              ...element.style,
              fill: index === 0 ? palette.main : palette.accent,
            },
          }
        : element,
    ),
    slides: deck.slides.map((slide) => ({
      ...slide,
      elements: slide.elements.map((element) =>
        element.type === "text"
          ? {
              ...element,
              style: {
                ...element.style,
                color: element.style.bold ? heading : palette.text,
              },
            }
          : element.type === "shape"
            ? { ...element, style: { ...element.style, fill: palette.main } }
            : element,
      ),
    })),
  };
}
export function layoutSlide(
  slide: Deck["slides"][number],
  theme: Theme,
  variant: "title" | "body" | "image",
) {
  const layout = theme.layouts[variant];
  const heading =
    contrastRatio(theme.palette.background, theme.palette.main) >= 4.5
      ? theme.palette.main
      : theme.palette.text;
  let textIndex = 0;
  let imageIndex = 0;
  const elements: SlideElement[] = slide.elements.map((element) => {
    if (element.type === "image")
      return imageIndex++ === 0 ? { ...element, ...layout.image } : element;
    if (element.type !== "text") return element;
    const index = textIndex++;
    const role = (
      index === 0 ? "eyebrow" : index === 1 ? "title" : "body"
    ) as keyof ThemeLayout;
    return {
      ...element,
      ...(index < 3 ? layout[role] : {}),
      style: {
        ...element.style,
        fontFamily: role === "body" ? theme.fonts.body : theme.fonts.heading,
        color: role === "body" ? theme.palette.text : heading,
      },
    };
  });
  return { ...slide, elements };
}
export function applyThemeToDeck(deck: Deck, theme: Theme): Deck {
  const effectiveTheme = theme.background?.color
    ? { ...theme, palette: { ...theme.palette, background: theme.background.color } }
    : theme;
  const slides = deck.slides.map((slide, index) => ({
    ...layoutSlide(
      slide,
      effectiveTheme,
      slide.elements.some((element) => element.type === "image")
        ? "image"
        : index === 0
          ? "title"
          : "body",
    ),
    background: theme.background ? { ...slide.background, ...theme.background, color: slide.background.color, imageSrc: slide.background?.imageSrc ?? theme.background.imageSrc } : slide.background,
  }));
  return {
    ...deck,
    themeId: theme.id,
    palette: effectiveTheme.palette,
    paletteId: undefined,
    paletteMapping: DEFAULT_MAPPING,
    palettePreferences: theme.palettePreferences || DEFAULT_PALETTE_PREFERENCES,
    masterElements: structuredClone(theme.masterElements),
    slides,
  };
}

export function parsePalettePaste(
  raw: string,
): Pick<MiranovaPalette, "base" | "sub" | "accent"> {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value && typeof value === "object") {
      const base = value.base ?? value.background;
      const sub = value.sub ?? value.main;
      const accent = value.accent;
      if (
        [base, sub, accent].every(
          (color) =>
            typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color),
        )
      )
        return {
          base: base as string,
          sub: sub as string,
          accent: accent as string,
        };
    }
  } catch {
    /* CSS/HEX fallback */
  }
  const colors = raw.match(/#[0-9a-fA-F]{6}\b/g);
  if (!colors || colors.length < 3)
    throw new Error("3色のHEX値を読み取れませんでした");
  return { base: colors[0], sub: colors[1], accent: colors[2] };
}
