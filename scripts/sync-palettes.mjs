import { writeFile, rename, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const url =
  "https://miranova-studio.github.io/three-color-palette/palettes-data.js";
const destination = fileURLToPath(
  new URL("../src/data/miranova-palettes.json", import.meta.url),
);
const temporary = `${destination}.tmp`;

try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const source = await response.text();
  const marker = "window.ATLAS_PALETTES =";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("ATLAS_PALETTES の代入が見つかりません");
  const arrayStart = source.indexOf("[", start + marker.length);
  const arrayEnd = source.lastIndexOf("]");
  if (arrayStart < 0 || arrayEnd <= arrayStart)
    throw new Error("配列が見つかりません");
  const palettes = JSON.parse(source.slice(arrayStart, arrayEnd + 1));
  if (!Array.isArray(palettes) || palettes.length === 0)
    throw new Error("パレット配列が空です");
  for (const palette of palettes) {
    if (
      typeof palette.id !== "string" ||
      typeof palette.name !== "string" ||
      ![palette.base, palette.sub, palette.accent].every((color) =>
        /^#[0-9a-fA-F]{6}$/.test(color),
      )
    ) {
      throw new Error(`不正なパレット: ${palette.id ?? "unknown"}`);
    }
  }
  await writeFile(temporary, `${JSON.stringify(palettes, null, 2)}\n`, "utf8");
  await rename(temporary, destination);
  console.log(
    `${palettes.length}件を src/data/miranova-palettes.json に同期しました`,
  );
} catch (error) {
  await unlink(temporary).catch(() => {});
  console.error(
    `パレット同期失敗。既存JSONは保持しました: ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = 1;
}
