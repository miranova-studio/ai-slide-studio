import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import regularUrl from "@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf?url";
import boldUrl from "@expo-google-fonts/noto-sans-jp/700Bold/NotoSansJP_700Bold.ttf?url";
import type { PDFFont, PDFPage } from "pdf-lib";
import type { Deck, Slide, SlideElement } from "../types";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "../types";

const SCALE = 72;
const WIDTH = SLIDE_WIDTH * SCALE;
const HEIGHT = SLIDE_HEIGHT * SCALE;

function color(value?: string) {
  const matched = /^#([0-9a-f]{6})$/i.exec(value || "");
  if (!matched) return rgb(0.12, 0.16, 0.23);
  const hex = matched[1];
  return rgb(
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  );
}

function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const output: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const char of [...paragraph]) {
      if (line && font.widthOfTextAtSize(line + char, size) > maxWidth) {
        output.push(line);
        line = char;
      } else line += char;
    }
    output.push(line);
  }
  return output;
}

async function dataImage(pdf: PDFDocument, src: string) {
  if (/^data:image\/jpeg;base64,/.test(src))
    return pdf.embedJpg(await (await fetch(src)).arrayBuffer());
  if (/^data:image\/png;base64,/.test(src))
    return pdf.embedPng(await (await fetch(src)).arrayBuffer());
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d")!.drawImage(image, 0, 0);
  return pdf.embedPng(
    await (await fetch(canvas.toDataURL("image/png"))).arrayBuffer(),
  );
}

async function drawElement(
  pdf: PDFDocument,
  page: PDFPage,
  element: SlideElement,
  regular: PDFFont,
  bold: PDFFont,
  deck: Deck,
) {
  const x = element.x * SCALE;
  const y = HEIGHT - (element.y + element.height) * SCALE;
  const width = element.width * SCALE;
  const height = element.height * SCALE;
  if (element.type === "text") {
    const font = element.style.bold ? bold : regular;
    const size = element.style.fontSize;
    const lineHeight = size * (element.style.lineHeight || 1.25);
    const lines = wrap(element.text, font, size, width);
    lines.forEach((line, index) => {
      const lineWidth = font.widthOfTextAtSize(line, size);
      const alignX =
        element.style.align === "center"
          ? x + (width - lineWidth) / 2
          : element.style.align === "right"
            ? x + width - lineWidth
            : x;
      const baseline = HEIGHT - element.y * SCALE - size - index * lineHeight;
      if (baseline >= y - size)
        page.drawText(line, {
          x: alignX,
          y: baseline,
          size,
          font,
          color: color(element.style.color || deck.palette.text),
        });
    });
  } else if (element.type === "image") {
    const image = await dataImage(pdf, element.src);
    if (element.style.fit === "contain") {
      const ratio = Math.min(width / image.width, height / image.height);
      const w = image.width * ratio,
        h = image.height * ratio;
      page.drawImage(image, {
        x: x + (width - w) / 2,
        y: y + (height - h) / 2,
        width: w,
        height: h,
        opacity: element.style.opacity,
      });
    } else
      page.drawImage(image, {
        x,
        y,
        width,
        height,
        opacity: element.style.opacity,
      });
  } else {
    const fill = color(element.style.fill);
    const stroke = color(element.style.stroke || element.style.fill);
    const borderWidth = element.style.strokeWidth || 0;
    const opacity = element.style.opacity ?? 1;
    if (element.shape === "ellipse")
      page.drawEllipse({
        x: x + width / 2,
        y: y + height / 2,
        xScale: width / 2,
        yScale: height / 2,
        color: fill,
        borderColor: stroke,
        borderWidth,
        opacity,
      });
    else if (element.shape === "line")
      page.drawLine({
        start: { x, y: y + height / 2 },
        end: { x: x + width, y: y + height / 2 },
        color: stroke,
        thickness: Math.max(1, borderWidth),
        opacity,
      });
    else if (element.shape === "arrow") {
      page.drawLine({
        start: { x, y: y + height / 2 },
        end: { x: x + width * 0.78, y: y + height / 2 },
        color: stroke,
        thickness: Math.max(2, borderWidth),
        opacity,
      });
      page.drawSvgPath(
        `M 0 0 L ${width * 0.24} ${height / 2} L 0 ${height} Z`,
        { x: x + width * 0.76, y, color: fill, opacity },
      );
    } else if (element.shape === "triangle")
      page.drawSvgPath(`M 0 0 L ${width / 2} ${height} L ${width} 0 Z`, {
        x,
        y,
        color: fill,
        borderColor: stroke,
        borderWidth,
        opacity,
      });
    else
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: fill,
        borderColor: stroke,
        borderWidth,
        opacity,
      });
  }
}

export async function lecturePdf(
  deck: Deck,
  slides: Slide[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    fetch(regularUrl).then((response) => response.arrayBuffer()),
    fetch(boldUrl).then((response) => response.arrayBuffer()),
  ]);
  const regular = await pdf.embedFont(regularBytes);
  const bold = await pdf.embedFont(boldBytes);
  const printable = slides.filter((slide) => !slide.hidden);
  if (!printable.length) {
    const page = pdf.addPage([WIDTH, HEIGHT]);
    page.drawText("表示対象のスライドはありません", {
      x: 72,
      y: HEIGHT / 2,
      size: 24,
      font: regular,
      color: color(deck.palette.text),
    });
  }
  for (const slide of printable) {
    const page = pdf.addPage([WIDTH, HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: WIDTH,
      height: HEIGHT,
      color: color(deck.palette.background),
    });
    for (const element of [
      ...(slide.showMaster ? deck.masterElements : []),
      ...slide.elements,
    ])
      await drawElement(pdf, page, element, regular, bold, deck);
  }
  return pdf.save();
}
