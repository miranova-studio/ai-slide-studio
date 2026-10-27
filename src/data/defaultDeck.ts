import { SCHEMA_VERSION, SLIDE_HEIGHT, SLIDE_WIDTH } from "../types";
import type {
  Deck,
  Slide,
  TextElement,
  TemplateId,
  ShapeElement,
} from "../types";

export function makeMasterElements(template: TemplateId): ShapeElement[] {
  const variants = {
    paper: {
      shape: "rect",
      x: 11.2,
      y: 1.55,
      width: 2.1,
      height: 5.95,
      fill: "#dc6339",
    },
    ink: {
      shape: "ellipse",
      x: 9.7,
      y: 0,
      width: 3.6,
      height: 3.6,
      fill: "#24334a",
    },
    signal: {
      shape: "triangle",
      x: 10.6,
      y: 0,
      width: 2.73,
      height: 7.5,
      fill: "#f05237",
    },
  } as const;
  const value = variants[template];
  return [
    {
      id: crypto.randomUUID(),
      type: "shape",
      shape: value.shape,
      x: value.x,
      y: value.y,
      width: value.width,
      height: value.height,
      style: { fill: value.fill, strokeWidth: 0 },
    },
  ];
}

export function makeText(
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  bold = false,
): TextElement {
  return {
    id: crypto.randomUUID(),
    type: "text",
    x,
    y,
    width,
    height,
    text,
    style: { fontSize, bold, lineHeight: 1.25 },
  };
}

export function makeSlide(
  eyebrow = "NEW SECTION",
  title = "新しいアイデア",
  body = "伝えたい内容をここに入力してください。",
): Slide {
  return {
    id: crypto.randomUUID(),
    hidden: false,
    showMaster: true,
    notes: [],
    elements: [
      makeText(eyebrow, 1.02, 1.65, 10.8, 0.35, 12, true),
      makeText(title, 1.02, 2.28, 10.7, 2.15, 44, true),
      makeText(body, 1.02, 5.05, 10.4, 1.15, 17),
    ],
  };
}

export const defaultDeck: Deck = {
  schemaVersion: SCHEMA_VERSION,
  id: "welcome-deck",
  title: "言葉を、伝わる形へ。",
  template: "paper",
  masterElements: makeMasterElements("paper"),
  canvas: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, unit: "in" },
  updatedAt: new Date().toISOString(),
  slides: [
    makeSlide(
      "FRAME / 01",
      "言葉を、\n伝わる形へ。",
      "文章から構成をつくり、ブラウザで整え、そのまま届ける。\nスライド制作の新しいワークスペース。",
    ),
    makeSlide(
      "WHY IT MATTERS",
      "考える時間を、\nもっと大切に。",
      "レイアウトの微調整に追われず、伝えたい内容とストーリーに集中できます。",
    ),
    makeSlide(
      "WORKFLOW",
      "書く。整える。\n共有する。",
      "台本を貼り付けるだけで下書きを生成。あとは一枚ずつ、あなたの言葉に磨きます。",
    ),
  ],
};
