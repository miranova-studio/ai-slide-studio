import { useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { courseDuration, formatDuration, lectureDuration } from "../course";
import type { Deck, Slide } from "../types";

function slideLabel(slide: Slide): string {
  const title = slide.elements.find(
    (element) => element.type === "text" && element.style.fontSize >= 24,
  );
  return title?.type === "text"
    ? title.text.replace(/\n/g, " ").slice(0, 32)
    : "スライド";
}

interface Props {
  deck: Deck;
  activeId: string;
  onInfo: () => void;
  onSelect: (slideId: string) => void;
  onAddSection: () => void;
  onAddLecture: (sectionId: string) => void;
  onAddSlide: () => void;
  onRenameSection: (id: string, title: string) => void;
  onRenameLecture: (id: string, title: string) => void;
  onDeleteSection: (id: string) => void;
  onDeleteLecture: (id: string) => void;
  onMove: (
    kind: "section" | "lecture" | "slide",
    sourceId: string,
    targetId: string,
  ) => void;
}

export function CourseOutline(props: Props) {
  const pointerDrag = useRef<{
    kind: "section" | "lecture" | "slide";
    id: string;
  } | null>(null);
  const course = props.deck.course!;
  const byId = new Map(props.deck.slides.map((slide) => [slide.id, slide]));
  const lectures = course.sections.flatMap((section) => section.lectures);
  const duration = courseDuration(props.deck);
  const pointerDrop = (
    kind: "section" | "lecture" | "slide",
    targetId: string,
  ) => {
    const source = pointerDrag.current;
    if (source?.kind === kind && source.id !== targetId)
      props.onMove(kind, source.id, targetId);
    pointerDrag.current = null;
  };
  return (
    <div className="course-outline">
      <button className="course-info-link" onClick={props.onInfo}>
        講座情報を編集
      </button>
      <div className="course-outline-summary">
        <strong>
          {lectures.length} レクチャー · {formatDuration(duration)}
        </strong>
        <small>台本・音声からの制作時間目安</small>
        {(lectures.length < 5 || duration < 1800) && (
          <p>
            Udemy要件の目安：{lectures.length < 5 ? "5レクチャー以上" : ""}
            {lectures.length < 5 && duration < 1800 ? "・" : ""}
            {duration < 1800 ? "動画30分以上" : ""}
            に向けて内容を確認してください。台本時間は動画時間ではありません。
          </p>
        )}
      </div>
      <div className="course-tree">
        {course.sections.map((section, sectionIndex) => (
          <div
            className="course-section"
            key={section.id}
            onPointerUp={(event) => {
              event.stopPropagation();
              pointerDrop("section", section.id);
            }}
          >
            <div className="course-tree-row">
              <span
                title="ドラッグで並び替え"
                className="course-drag-handle"
                onPointerDown={(event) => {
                  event.preventDefault();
                  pointerDrag.current = { kind: "section", id: section.id };
                }}
              >
                {sectionIndex + 1}.
              </span>
              <input
                aria-label={`セクション${sectionIndex + 1}の名前`}
                value={section.title}
                onChange={(event) =>
                  props.onRenameSection(section.id, event.target.value)
                }
              />
              <button
                title="セクションを削除"
                aria-label={`${section.title}を削除`}
                onClick={() => props.onDeleteSection(section.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
            {section.lectures.map((lecture, lectureIndex) => (
              <div
                className="course-lecture"
                key={lecture.id}
                onPointerUp={(event) => {
                  event.stopPropagation();
                  pointerDrop("lecture", lecture.id);
                }}
              >
                <div className="course-tree-row lecture-row">
                  <span
                    title="ドラッグで並び替え"
                    className="course-drag-handle"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      pointerDrag.current = { kind: "lecture", id: lecture.id };
                    }}
                  >
                    {sectionIndex + 1}-{lectureIndex + 1}
                  </span>
                  <input
                    aria-label={`レクチャー${sectionIndex + 1}-${lectureIndex + 1}の名前`}
                    value={lecture.title}
                    onChange={(event) =>
                      props.onRenameLecture(lecture.id, event.target.value)
                    }
                  />
                  <button
                    title="レクチャーを削除"
                    aria-label={`${lecture.title}を削除`}
                    onClick={() => props.onDeleteLecture(lecture.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <small>
                  {formatDuration(lectureDuration(props.deck, lecture))}
                </small>
                {lecture.slideIds.map((id, slideIndex) => {
                  const slide = byId.get(id);
                  return slide ? (
                    <button
                      key={id}
                      className={`course-slide-link ${props.activeId === id ? "active" : ""}`}
                      onPointerDown={() => {
                        pointerDrag.current = { kind: "slide", id };
                      }}
                      onPointerUp={(event) => {
                        event.stopPropagation();
                        pointerDrop("slide", id);
                      }}
                      onClick={() => props.onSelect(id)}
                    >
                      {String(slideIndex + 1).padStart(2, "0")} ·{" "}
                      {slideLabel(slide)}
                    </button>
                  ) : null;
                })}
                <button
                  className="course-add-lecture"
                  onClick={() => props.onSelect(lecture.slideIds[0])}
                >
                  レクチャーを開く
                </button>
              </div>
            ))}
            <button
              className="course-add-lecture"
              onClick={() => props.onAddLecture(section.id)}
            >
              <Plus size={12} /> レクチャーを追加
            </button>
          </div>
        ))}
      </div>
      <button className="add-slide" onClick={props.onAddSection}>
        <Plus size={15} /> セクションを追加
      </button>
      <button className="add-slide" onClick={props.onAddSlide}>
        <Plus size={15} /> このレクチャーにスライドを追加
      </button>
    </div>
  );
}
