import JSZip from "jszip";
import { courseSlides, slideFileStem } from "../course";
import { loadAudio } from "./storage";
import type { Deck, Slide } from "../types";
import { lecturePdf } from "./lecturePdf";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function safeFilePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "untitled"
  );
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function scriptEntries(
  deck: Deck,
): {
  stem: string;
  slide: Slide;
  sectionIndex: number;
  lectureIndex: number;
}[] {
  const byId = new Map(deck.slides.map((slide) => [slide.id, slide]));
  return deck.course!.sections.flatMap((section, sectionIndex) =>
    section.lectures.flatMap((lecture, lectureIndex) =>
      lecture.slideIds.flatMap((id, slideIndex) => {
        const slide = byId.get(id);
        return slide
          ? [
              {
                stem: slideFileStem(sectionIndex, lectureIndex, slideIndex),
                slide,
                sectionIndex,
                lectureIndex,
              },
            ]
          : [];
      }),
    ),
  );
}

export function scriptCsv(deck: Deck): string {
  return (
    "\uFEFF" +
    [
      "ファイル名,台本",
      ...scriptEntries(deck).map(
        ({ stem, slide }) =>
          `${csvCell(`${stem}.txt`)},${csvCell(slide.narration)}`,
      ),
    ].join("\r\n") +
    "\r\n"
  );
}

export async function scriptsZip(deck: Deck): Promise<Blob> {
  const zip = new JSZip();
  for (const { stem, slide } of scriptEntries(deck))
    zip.file(`scripts/${stem}.txt`, slide.narration);
  zip.file("scripts-index.csv", scriptCsv(deck));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function coursePackageZip(deck: Deck): Promise<Blob> {
  if (deck.mode !== "course" || !deck.course)
    throw new Error("講座モードで書き出してください");
  const zip = new JSZip();
  zip.file("course.json", JSON.stringify(deck, null, 2));
  zip.file("scripts-index.csv", scriptCsv(deck));
  zip.file(
    "course-description.txt",
    [
      deck.title,
      deck.course.subtitle,
      "",
      "対象者",
      deck.course.audience,
      "",
      "学習目標",
      ...deck.course.objectives.map((value) => `- ${value}`),
      "",
      "前提知識",
      ...deck.course.prerequisites.map((value) => `- ${value}`),
      "",
      "講座説明",
      deck.course.description,
    ].join("\n"),
  );
  const byId = new Map(courseSlides(deck).map((slide) => [slide.id, slide]));
  for (const [sectionIndex, section] of deck.course.sections.entries()) {
    for (const [lectureIndex, lecture] of section.lectures.entries()) {
      const folder = zip.folder(
        `${String(sectionIndex + 1).padStart(2, "0")}-${safeFilePart(section.title)}/${String(lectureIndex + 1).padStart(2, "0")}-${safeFilePart(lecture.title)}`,
      )!;
      const slides = lecture.slideIds
        .map((id) => byId.get(id))
        .filter((slide): slide is Slide => !!slide);
      folder.file("slides.pdf", await lecturePdf(deck, slides));
      for (const [slideIndex, slide] of slides.entries()) {
        const stem = slideFileStem(sectionIndex, lectureIndex, slideIndex);
        folder.file(`${stem}.txt`, slide.narration);
        if (slide.audio) {
          const audio = await loadAudio(slide.audio.id);
          if (!audio)
            throw new Error(
              `${stem}: 音声ファイルがIndexedDBにありません。再取り込みしてください`,
            );
          folder.file(
            `${stem}.${slide.audio.filename.split(".").pop()?.toLowerCase() || "mp3"}`,
            audio,
          );
        }
      }
    }
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
