import type { ThemePalette, PaletteMapping, PalettePreferences } from "./themes";
export const SCHEMA_VERSION = 5;
export const SLIDE_WIDTH = 13.333;
export const SLIDE_HEIGHT = 7.5;
export type TemplateId = "paper" | "ink" | "signal";

interface ElementBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  style: {
    fontFamily?: string;
    fontSize: number;
    color?: string;
    bold?: boolean;
    align?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
    lineHeight?: number;
  };
}
export interface ImageElement extends ElementBase {
  type: "image";
  src: string;
  alt?: string;
  style: { fit?: "cover" | "contain"; opacity?: number; borderRadius?: number };
}
export interface ShapeElement extends ElementBase {
  type: "shape";
  shape: "rect" | "roundRect" | "ellipse" | "triangle" | "line" | "arrow";
  style: {
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}
export type SlideElement = TextElement | ImageElement | ShapeElement;
export type NoteKind = "revision" | "question" | "memo";
export interface SlideNote {
  id: string;
  kind: NoteKind;
  text: string;
  completed: boolean;
  createdAt: string;
}
export interface Slide {
  id: string;
  elements: SlideElement[];
  hidden: boolean;
  notes: SlideNote[];
  showMaster: boolean;
  narration: string;
  audio?: {
    id: string;
    filename: string;
    mimeType: string;
    kind: "ai" | "self";
    durationSeconds: number;
  };
}
export interface CourseLecture {
  id: string;
  title: string;
  slideIds: string[];
}
export interface CourseSection {
  id: string;
  title: string;
  lectures: CourseLecture[];
}
export interface CourseData {
  subtitle: string;
  audience: string;
  objectives: string[];
  prerequisites: string[];
  description: string;
  charactersPerMinute: number;
  sections: CourseSection[];
}
export interface Deck {
  schemaVersion: number;
  mode: "deck" | "course";
  id: string;
  title: string;
  template: TemplateId;
  themeId: string;
  palette: ThemePalette;
  paletteId?: string;
  paletteMapping: PaletteMapping;
  palettePreferences?: PalettePreferences;
  masterElements: SlideElement[];
  canvas: { width: number; height: number; unit: "in" };
  slides: Slide[];
  course?: CourseData;
  updatedAt: string;
}
