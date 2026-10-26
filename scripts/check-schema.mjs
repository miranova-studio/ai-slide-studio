import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const schema = JSON.parse(
  fs.readFileSync(
    new URL("../src/schema/slide-deck.schema.json", import.meta.url),
  ),
);
const sample = JSON.parse(
  fs.readFileSync(new URL("../examples/japanese-sample.json", import.meta.url)),
);
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(sample))
  throw new Error(JSON.stringify(validate.errors, null, 2));
for (const slide of sample.slides) {
  for (const element of slide.elements) {
    if (
      element.x + element.width > sample.canvas.width + 0.001 ||
      element.y + element.height > sample.canvas.height + 0.001
    ) {
      throw new Error(`${element.id} exceeds the canvas`);
    }
  }
}
console.log("Slide JSON Schema and Japanese sample: valid");
