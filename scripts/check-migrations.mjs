import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
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
  const {
    backgroundColor,
    updateBackgrounds,
    resetBackgroundColors,
    applyBackgroundToAll,
  } = await vite.ssrLoadModule("/src/backgrounds.ts");
  const { applyThemeToDeck, builtInThemes } =
    await vite.ssrLoadModule("/src/themes.ts");
  const v7 = JSON.parse(
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
  const v6 = structuredClone(v7);
  v6.schemaVersion = 6;
  for (const slide of v6.slides) delete slide.background.color;
  const courseV6 = structuredClone(course);
  courseV6.schemaVersion = 6;
  for (const slide of courseV6.slides) delete slide.background.color;
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
    ["course-v6", courseV6],
    ["v7", v7],
    ["v6", v6],
    ["v5", v5],
    ["v4", v4],
    ["v3", v3],
    ["v2", v2],
    ["v1", v1],
  ]) {
    const result = assertDeck(migrateDeck(value));
    if (
      result.schemaVersion !== 7 ||
      result.slides.length === 0 ||
      (label.startsWith("course") && result.mode !== "course")
    )
      throw new Error(`${label}: 移行結果が不正です`);
  }
  const migratedV6 = migrateDeck(v6);
  assert.deepEqual(
    migratedV6.slides.map((slide) => slide.background),
    v6.slides.map((slide) => slide.background),
  );
  assert.deepEqual(
    migratedV6.slides.map((slide) => slide.elements),
    v6.slides.map((slide) => slide.elements),
  );
  assert.deepEqual(migratedV6.masterElements, v6.masterElements);
  assert.deepEqual(migratedV6.palette, v6.palette);
  assert.deepEqual(migrateDeck(courseV6).course, courseV6.course);
  for (const slide of migratedV6.slides) {
    assert.equal(backgroundColor(migratedV6, slide), v6.palette.background);
    assert.equal(slide.background.color, undefined);
  }
  const [first, second] = migratedV6.slides;
  const patched = updateBackgrounds(migratedV6, [first.id, second.id], {
    color: "#112233",
    colorOpacity: 0.4,
  });
  assert.equal(patched.slides[0].background.color, "#112233");
  assert.equal(patched.slides[1].background.colorOpacity, 0.4);
  assert.deepEqual(
    resetBackgroundColors(patched, [first.id, second.id]).slides.map(
      (slide) => slide.background.color,
    ),
    [undefined, undefined],
  );
  const darkTheme = builtInThemes.find((theme) => theme.id === "dark");
  assert.ok(darkTheme);
  const switchedPinned = applyThemeToDeck(patched, darkTheme);
  assert.equal(
    backgroundColor(switchedPinned, switchedPinned.slides[0]),
    "#112233",
  );
  const switchedInherited = applyThemeToDeck(migratedV6, darkTheme);
  assert.equal(
    backgroundColor(switchedInherited, switchedInherited.slides[0]),
    darkTheme.palette.background,
  );
  const different = updateBackgrounds(patched, [second.id], {
    colorOpacity: 0.8,
  });
  const withHidden = {
    ...different,
    slides: different.slides.map((slide, index) =>
      index === 1 ? { ...slide, hidden: true } : slide,
    ),
  };
  const visibleOnly = applyBackgroundToAll(withHidden, first.id, false);
  assert.equal(visibleOnly.slides[1].background.colorOpacity, 0.8);
  assert.equal(visibleOnly.slides[1].hidden, true);
  const all = applyBackgroundToAll(withHidden, first.id, true);
  assert.deepEqual(all.slides[1].background, all.slides[0].background);
  const frozenThemeColor = applyBackgroundToAll(migratedV6, first.id, true);
  assert.equal(
    frozenThemeColor.slides[0].background.color,
    migratedV6.palette.background,
  );
  assert.equal(
    frozenThemeColor.slides[1].background.color,
    migratedV6.palette.background,
  );
  console.log(
    "v1/v2/v3/v4/v5/v6/v7 deck migration and background operations: valid",
  );
} finally {
  await vite.close();
}
