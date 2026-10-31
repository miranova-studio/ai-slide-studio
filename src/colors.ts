const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function addRecentColor(colors: readonly string[], value: string): string[] {
  const color = normalizeHexColor(value);
  if (!color) return [...colors];
  return [color, ...colors.filter((item) => item.toUpperCase() !== color)].slice(0, 8);
}

export function parseRecentColors(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.reverse().reduce<string[]>((colors, item) =>
      typeof item === "string" ? addRecentColor(colors, item) : colors, []);
  } catch {
    return [];
  }
}
