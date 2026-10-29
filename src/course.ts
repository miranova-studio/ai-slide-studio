import type { CourseData, CourseLecture, Deck, Slide } from "./types";

export function makeCourse(slides: Slide[]): CourseData {
  return {
    subtitle: "",
    audience: "",
    objectives: [],
    prerequisites: [],
    description: "",
    charactersPerMinute: 300,
    sections: [
      {
        id: crypto.randomUUID(),
        title: "セクション 1",
        lectures: [
          {
            id: crypto.randomUUID(),
            title: "レクチャー 1",
            slideIds: slides.map((slide) => slide.id),
          },
        ],
      },
    ],
  };
}

export function lectureForSlide(
  course: CourseData,
  slideId: string,
): CourseLecture | undefined {
  return course.sections
    .flatMap((section) => section.lectures)
    .find((lecture) => lecture.slideIds.includes(slideId));
}

export function courseSlides(deck: Deck): Slide[] {
  if (deck.mode !== "course" || !deck.course) return deck.slides;
  const byId = new Map(deck.slides.map((slide) => [slide.id, slide]));
  return deck.course.sections.flatMap((section) =>
    section.lectures.flatMap((lecture) =>
      lecture.slideIds.map((id) => byId.get(id)!).filter(Boolean),
    ),
  );
}

export function slideDuration(
  slide: Slide,
  charactersPerMinute: number,
): number {
  if (slide.audio) return slide.audio.durationSeconds;
  return ([...slide.narration].length / charactersPerMinute) * 60;
}

export function lectureDuration(deck: Deck, lecture: CourseLecture): number {
  const byId = new Map(deck.slides.map((slide) => [slide.id, slide]));
  return lecture.slideIds.reduce(
    (total, id) =>
      total +
      (byId.get(id)
        ? slideDuration(byId.get(id)!, deck.course?.charactersPerMinute || 300)
        : 0),
    0,
  );
}

export function courseDuration(deck: Deck): number {
  return (
    deck.course?.sections.reduce(
      (total, section) =>
        total +
        section.lectures.reduce(
          (sum, lecture) => sum + lectureDuration(deck, lecture),
          0,
        ),
      0,
    ) || 0
  );
}

export function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return `${Math.floor(minutes / 60)}時間${String(minutes % 60).padStart(2, "0")}分`;
}

export function formatClock(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

export function slideFileStem(
  sectionIndex: number,
  lectureIndex: number,
  slideIndex: number,
): string {
  return `S${String(sectionIndex + 1).padStart(2, "0")}-L${String(lectureIndex + 1).padStart(2, "0")}-${String(slideIndex + 1).padStart(2, "0")}`;
}
