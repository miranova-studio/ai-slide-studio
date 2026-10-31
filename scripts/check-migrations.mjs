import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "silent",
});
try {
  const { migrateDeck, assertDeck } = await vite.ssrLoadModule(
    "/src/schema/validate.ts",
  );
  const v6 = JSON.parse(
    await readFile(
      new URL("../examples/japanese-sample.json", import.meta.url),
      "utf8",
    ),
  );
  const course = JSON.parse(
    await readFile(
      new URL("../docs/examples/course-sample.json", import.meta.url),
      "utf8",
    ),
  );
  const v5 = structuredClone(v6);
  v5.schemaVersion = 5;
  for (const slide of v5.slides) {
    delete slide.background;
    for (const element of slide.elements) {
      delete element.style.fillOpacity;
      delete element.style.strokeOpacity;
      delete element.style.opacity;
    }
  }
  const v4 = structuredClone(v5);
  v4.schemaVersion = 4;
  delete v4.mode;
  for (const slide of v4.slides) delete slide.narration;
  const v3 = structuredClone(v4);
  v3.schemaVersion = 3;
  delete v3.themeId;
  delete v3.palette;
  delete v3.paletteMapping;
  const v2 = structuredClone(v3);
  v2.schemaVersion = 2;
  delete v2.masterElements;
  for (const slide of v2.slides) delete slide.showMaster;
  const v1 = JSON.parse(
    await readFile(
      new URL("../examples/v1-import-check.json", import.meta.url),
      "utf8",
    ),
  );
  for (const [label, value] of [
    ["course", course],
    ["v6", v6],
    ["v5", v5],
    ["v4", v4],
    ["v3", v3],
    ["v2", v2],
    ["v1", v1],
  ]) {
    const result = assertDeck(migrateDeck(value));
    if (
      result.schemaVersion !== 6 ||
      result.slides.length === 0 ||
      (label === "course" && result.mode !== "course")
    )
      throw new Error(`${label}: 移行結果が不正です`);
  }
  console.log("v1/v2/v3/v4/v5/v6 deck migration: valid");
} finally {
  await vite.close();
}
