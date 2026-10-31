import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "silent",
});
try {
  const { normalizeHexColor, addRecentColor, parseRecentColors } =
    await vite.ssrLoadModule("/src/colors.ts");
  assert.equal(normalizeHexColor(" #a1b2c3 "), "#A1B2C3");
  assert.equal(normalizeHexColor("#12345"), null);
  assert.equal(normalizeHexColor("red"), null);
  assert.equal(normalizeHexColor("#1234567"), null);
  assert.deepEqual(addRecentColor(["#112233", "#AABBCC"], "#aabbcc"), [
    "#AABBCC",
    "#112233",
  ]);
  assert.deepEqual(
    parseRecentColors('["#112233","#AABBCC"]'),
    ["#112233", "#AABBCC"],
  );
  assert.deepEqual(parseRecentColors("invalid json"), []);
  assert.equal(
    Array.from({ length: 10 }, (_, index) => index).reduce(
      (colors, index) => addRecentColor(colors, `#00000${index.toString(16)}`),
      [],
    ).length,
    8,
  );
  console.log("HEX validation and recent colors: valid");
} finally {
  await vite.close();
}
