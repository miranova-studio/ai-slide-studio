export const SCHEMA_VERSION = 1;
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
  shape: "rect" | "ellipse";
  style: {
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}
export type SlideElement = TextElement | ImageElement | ShapeElement;
export interface Slide {
  id: string;
  elements: SlideElement[];
}
export interface Deck {
  schemaVersion: number;
  id: string;
  title: string;
  template: TemplateId;
  canvas: { width: number; height: number; unit: "in" };
  slides: Slide[];
  updatedAt: string;
}
