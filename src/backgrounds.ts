import type { Deck, Slide, SlideBackground } from "./types";

export function backgroundColor(deck: Deck, slide: Slide): string {
  return slide.background.color ?? deck.palette.background;
}

export function updateBackgrounds(
  deck: Deck,
  slideIds: readonly string[],
  patch: Partial<SlideBackground>,
): Deck {
  const ids = new Set(slideIds);
  if (!ids.size) return deck;
  const changed = deck.slides.some(
    (slide) =>
      ids.has(slide.id) &&
      Object.entries(patch).some(
        ([key, value]) =>
          slide.background[key as keyof SlideBackground] !== value,
      ),
  );
  if (!changed) return deck;
  return {
    ...deck,
    slides: deck.slides.map((slide) =>
      ids.has(slide.id)
        ? { ...slide, background: { ...slide.background, ...patch } }
        : slide,
    ),
  };
}

export function resetBackgroundColors(
  deck: Deck,
  slideIds: readonly string[],
): Deck {
  const ids = new Set(slideIds);
  if (
    !ids.size ||
    !deck.slides.some((slide) => ids.has(slide.id) && slide.background.color)
  )
    return deck;
  return {
    ...deck,
    slides: deck.slides.map((slide) => {
      if (!ids.has(slide.id) || !slide.background.color) return slide;
      const { color: _color, ...background } = slide.background;
      return { ...slide, background };
    }),
  };
}

export function applyBackgroundToAll(
  deck: Deck,
  sourceId: string,
  includeHidden: boolean,
): Deck {
  const source = deck.slides.find((slide) => slide.id === sourceId);
  if (!source) return deck;
  const background = {
    ...source.background,
    color: backgroundColor(deck, source),
  };
  return {
    ...deck,
    slides: deck.slides.map((slide) =>
      includeHidden || !slide.hidden
        ? { ...slide, background: { ...background } }
        : slide,
    ),
  };
}
