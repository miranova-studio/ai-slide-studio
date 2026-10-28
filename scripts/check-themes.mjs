import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const directory = fileURLToPath(new URL("../themes/", import.meta.url));
const schema = JSON.parse(
  await readFile(
    new URL("../src/schema/theme.schema.json", import.meta.url),
    "utf8",
  ),
);
const validate = new Ajv2020({ allErrors: true }).compile(schema);
const files = (await readdir(directory)).filter((name) =>
  name.endsWith(".json"),
);
if (files.length < 8) throw new Error(`テーマが8件未満です: ${files.length}`);
const ids = new Set();
for (const file of files) {
  const theme = JSON.parse(
    await readFile(new URL(`../themes/${file}`, import.meta.url), "utf8"),
  );
  if (!validate(theme))
    throw new Error(`${file}: ${JSON.stringify(validate.errors)}`);
  if (ids.has(theme.id)) throw new Error(`重複ID: ${theme.id}`);
  ids.add(theme.id);
  if (file !== `${theme.id}.json`)
    throw new Error(`${file}: ファイル名は ${theme.id}.json にしてください`);
  for (const shape of theme.masterElements) {
    if (shape.x + shape.width > 13.334 || shape.y + shape.height > 7.501)
      throw new Error(`${file}: マスター要素が範囲外です`);
  }
  for (const [variant, layout] of Object.entries(theme.layouts))
    for (const [role, box] of Object.entries(layout)) {
      if (box.x + box.width > 13.334 || box.y + box.height > 7.501)
        throw new Error(`${file}: レイアウト ${variant}/${role} が範囲外です`);
    }
}
console.log(`${files.length}テーマを検証しました`);
