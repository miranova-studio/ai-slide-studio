import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  FileInput,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  ListOrdered,
  MonitorPlay,
  Plus,
  Save,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { defaultDeck, makeSlide, makeText } from "./data/defaultDeck";
import { assertDeck, migrateDeck } from "./schema/validate";
import { loadDeck, saveDeck } from "./services/storage";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./types";
import type {
  Deck,
  NoteKind,
  Slide,
  SlideElement,
  TemplateId,
  TextElement,
} from "./types";
import "./styles.css";

const templates: { id: TemplateId; label: string; description: string }[] = [
  {
    id: "paper",
    label: "Editorial",
    description: "静かな余白とタイポグラフィ",
  },
  { id: "ink", label: "Midnight", description: "暗色で集中を引き出す" },
  { id: "signal", label: "Signal", description: "鮮やかな色と大胆な構成" },
];

type ViewMode = "slide" | "grid" | "scroll";
type RailTab = "outline" | "thumbnails";
type PanelTab = "edit" | "notes";
const noteLabels: Record<NoteKind, string> = {
  revision: "修正",
  question: "質問",
  memo: "メモ",
};

function slideTitle(slide: Slide, index: number): string {
  const texts = slide.elements.filter(
    (element): element is TextElement => element.type === "text",
  );
  return (
    texts
      .find((element) => element.style.fontSize >= 24)
      ?.text.trim()
      .replace(/\s+/g, " ") ||
    texts[0]?.text.trim().replace(/\s+/g, " ") ||
    `スライド ${index + 1}`
  );
}

function elementBox(element: SlideElement): React.CSSProperties {
  return {
    left: `${(element.x / SLIDE_WIDTH) * 100}%`,
    top: `${(element.y / SLIDE_HEIGHT) * 100}%`,
    width: `${(element.width / SLIDE_WIDTH) * 100}%`,
    height: `${(element.height / SLIDE_HEIGHT) * 100}%`,
  };
}

function SlideCanvas({
  slide,
  template,
  editable = false,
  selectedId,
  onSelect,
  onTextChange,
}: {
  slide: Slide;
  template: TemplateId;
  editable?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onTextChange?: (id: string, text: string) => void;
}) {
  return (
    <div className={`slide-canvas template-${template}`}>
      <div className="slide-chrome">
        <span>FRAME</span>
        <span className="slide-count-mark">●</span>
      </div>
      <div className="accent-shape" aria-hidden="true" />
      {slide.elements.map((element) => {
        const box = elementBox(element);
        const selected =
          editable && selectedId === element.id ? " element-selected" : "";
        if (element.type === "text") {
          const style: React.CSSProperties = {
            ...box,
            fontFamily:
              element.style.fontFamily || "'Noto Sans JP', sans-serif",
            fontSize: `${(element.style.fontSize / 72 / SLIDE_WIDTH) * 100}cqw`,
            color: element.style.color || undefined,
            fontWeight: element.style.bold ? 700 : 400,
            textAlign: element.style.align || "left",
            lineHeight: element.style.lineHeight || 1.25,
            justifyContent:
              element.style.verticalAlign === "middle"
                ? "center"
                : element.style.verticalAlign === "bottom"
                  ? "flex-end"
                  : "flex-start",
          };
          return (
            <div
              key={element.id}
              className={`slide-element slide-text${selected}`}
              style={style}
              contentEditable={editable}
              suppressContentEditableWarning
              spellCheck={false}
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.(element.id);
              }}
              onBlur={(event) =>
                onTextChange?.(element.id, event.currentTarget.innerText)
              }
            >
              {element.text}
            </div>
          );
        }
        if (element.type === "image")
          return (
            <div
              key={element.id}
              className={`slide-element slide-image${selected}`}
              style={{ ...box, opacity: element.style.opacity }}
              onClick={() => onSelect?.(element.id)}
            >
              <img
                src={element.src}
                alt={element.alt || ""}
                style={{
                  objectFit: element.style.fit || "cover",
                  borderRadius: `${element.style.borderRadius || 0}px`,
                }}
              />
            </div>
          );
        return (
          <div
            key={element.id}
            className={`slide-element slide-shape${selected}`}
            style={{
              ...box,
              background: element.style.fill,
              opacity: element.style.opacity,
              border: element.style.stroke
                ? `${element.style.strokeWidth || 1}px solid ${element.style.stroke}`
                : undefined,
              borderRadius: element.shape === "ellipse" ? "50%" : undefined,
            }}
            onClick={() => onSelect?.(element.id)}
          />
        );
      })}
    </div>
  );
}

export default function App() {
  const [deck, setDeck] = useState<Deck>(defaultDeck);
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState(defaultDeck.slides[0].id);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [scriptOpen, setScriptOpen] = useState(false);
  const [script, setScript] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("slide");
  const [railTab, setRailTab] = useState<RailTab>("thumbnails");
  const [panelTab, setPanelTab] = useState<PanelTab>("edit");
  const [noteKind, setNoteKind] = useState<NoteKind>("revision");
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const activeIndex = Math.max(
    0,
    deck.slides.findIndex((slide) => slide.id === activeId),
  );
  const activeSlide = deck.slides[activeIndex];
  const visibleSlides = deck.slides.filter((slide) => !slide.hidden);
  const selected = activeSlide?.elements.find(
    (element) => element.id === selectedId,
  );
  const templateInfo = useMemo(
    () => templates.find((item) => item.id === deck.template)!,
    [deck.template],
  );

  useEffect(() => {
    loadDeck()
      .then((loaded) => {
        setDeck(loaded);
        setActiveId(loaded.slides[0].id);
      })
      .catch((error) =>
        notify(
          error instanceof Error
            ? `保存データを読めません: ${error.message}`
            : "保存データを読めません",
        ),
      )
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!presenting) return;
      if (event.key === "Escape") setPresenting(false);
      if (event.key === "ArrowRight")
        setPresentIndex((i) => Math.min(visibleSlides.length - 1, i + 1));
      if (event.key === "ArrowLeft") setPresentIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presenting, visibleSlides.length]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }
  function changeDeck(update: (current: Deck) => Deck) {
    setDeck((current) => ({
      ...update(current),
      updatedAt: new Date().toISOString(),
    }));
  }
  function changeSlide(update: (slide: Slide) => Slide) {
    changeDeck((current) => ({
      ...current,
      slides: current.slides.map((slide) =>
        slide.id === activeId ? update(slide) : slide,
      ),
    }));
  }
  function updateElement(id: string, patch: Partial<SlideElement>) {
    changeSlide((slide) => ({
      ...slide,
      elements: slide.elements.map((element) =>
        element.id === id
          ? ({ ...element, ...patch } as SlideElement)
          : element,
      ),
    }));
  }
  function addElement(element: SlideElement) {
    changeSlide((slide) => ({
      ...slide,
      elements: [...slide.elements, element],
    }));
    setSelectedId(element.id);
  }
  function addSlide() {
    const next = makeSlide();
    changeDeck((current) => {
      const slides = [...current.slides];
      slides.splice(activeIndex + 1, 0, next);
      return { ...current, slides };
    });
    setActiveId(next.id);
    setSelectedId(undefined);
  }
  function deleteSlide(id: string) {
    if (deck.slides.length === 1) return notify("最後の1枚は削除できません");
    const index = deck.slides.findIndex((slide) => slide.id === id);
    const slides = deck.slides.filter((slide) => slide.id !== id);
    changeDeck((current) => ({ ...current, slides }));
    if (id === activeId) {
      setActiveId(slides[Math.min(index, slides.length - 1)].id);
      setSelectedId(undefined);
    }
  }
  function reorder(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    changeDeck((current) => {
      const slides = [...current.slides];
      const from = slides.findIndex((slide) => slide.id === draggedId);
      const to = slides.findIndex((slide) => slide.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);
      return { ...current, slides };
    });
    setDraggedId(null);
  }
  function selectSlide(id: string) {
    setActiveId(id);
    setSelectedId(undefined);
  }
  function addNote() {
    const text = noteText.trim();
    if (!text) return notify("内容を入力してください");
    changeSlide((slide) => ({
      ...slide,
      notes: [
        ...slide.notes,
        {
          id: crypto.randomUUID(),
          kind: noteKind,
          text,
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setNoteText("");
  }
  function toggleNote(id: string) {
    changeSlide((slide) => ({
      ...slide,
      notes: slide.notes.map((note) =>
        note.id === id ? { ...note, completed: !note.completed } : note,
      ),
    }));
  }
  function startPresentation() {
    if (!visibleSlides.length) return notify("表示できるスライドがありません");
    setPresentIndex(
      Math.max(
        0,
        visibleSlides.findIndex((slide) => slide.id === activeId),
      ),
    );
    setPresenting(true);
  }
  function printDeck() {
    if (!visibleSlides.length)
      return notify("PDFに出力できるスライドがありません");
    window.print();
  }
  async function save() {
    try {
      await saveDeck(assertDeck(deck));
      notify("IndexedDBに保存しました");
    } catch (error) {
      notify(
        error instanceof Error
          ? `保存できません: ${error.message}`
          : "保存できません",
      );
    }
  }
  async function importJson(file?: File) {
    if (!file) return;
    try {
      const imported = migrateDeck(JSON.parse(await file.text()));
      await saveDeck(imported);
      setDeck(imported);
      setActiveId(imported.slides[0].id);
      setSelectedId(undefined);
      notify(`${imported.slides.length}枚をインポートしました`);
    } catch (error) {
      notify(
        error instanceof Error
          ? `インポート失敗: ${error.message}`
          : "インポートに失敗しました",
      );
    }
    if (jsonFileRef.current) jsonFileRef.current.value = "";
  }
  function exportJson() {
    try {
      const blob = new Blob([JSON.stringify(assertDeck(deck), null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${deck.title || "deck"}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("JSONを書き出しました");
    } catch (error) {
      notify(error instanceof Error ? error.message : "JSONを書き出せません");
    }
  }
  function generateDraft() {
    const paragraphs = script
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!paragraphs.length) return notify("文章を入力してください");
    const slides = paragraphs.slice(0, 20).map((paragraph, index) => {
      const lines = paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return makeSlide(
        index === 0
          ? "OVERVIEW"
          : `SECTION ${String(index + 1).padStart(2, "0")}`,
        lines[0] || "新しいスライド",
        lines.slice(1).join("\n") || "補足をここに追加できます。",
      );
    });
    changeDeck((current) => ({
      ...current,
      title:
        slides[0].elements[1].type === "text"
          ? slides[0].elements[1].text
          : current.title,
      slides,
    }));
    setActiveId(slides[0].id);
    setSelectedId(undefined);
    setScriptOpen(false);
    notify(`${slides.length}枚の下書きを作成しました`);
  }
  function uploadImage(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      return notify("PNG・JPG・WebPを選んでください");
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      if (selected?.type === "image")
        updateElement(selected.id, {
          src,
          alt: file.name,
        } as Partial<SlideElement>);
      else {
        const image: SlideElement = {
          id: crypto.randomUUID(),
          type: "image",
          x: 7.3,
          y: 1.45,
          width: 4.75,
          height: 4.65,
          src,
          alt: file.name,
          style: { fit: "cover" },
        };
        changeSlide((slide) => ({
          ...slide,
          elements: [
            ...slide.elements.map((element) =>
              element.type === "text" && element.x < 2 && element.width > 6.2
                ? { ...element, width: 6.2 }
                : element,
            ),
            image,
          ],
        }));
        setSelectedId(image.id);
      }
      notify("画像を追加しました");
    };
    reader.readAsDataURL(file);
    if (imageFileRef.current) imageFileRef.current.value = "";
  }
  function deleteSelected() {
    if (!selected) return;
    changeSlide((slide) => ({
      ...slide,
      elements: slide.elements.filter((element) => element.id !== selected.id),
    }));
    setSelectedId(undefined);
  }
  function updateGeometry(key: "x" | "y" | "width" | "height", value: number) {
    if (!selected || !Number.isFinite(value)) return;
    const max = key === "x" || key === "width" ? SLIDE_WIDTH : SLIDE_HEIGHT;
    const other =
      key === "x"
        ? selected.width
        : key === "y"
          ? selected.height
          : key === "width"
            ? selected.x
            : selected.y;
    const safe = Math.max(
      key === "width" || key === "height" ? 0.1 : 0,
      Math.min(max - other, value),
    );
    updateElement(selected.id, {
      [key]: Number(safe.toFixed(2)),
    } as Partial<SlideElement>);
  }

  if (!activeSlide) return null;
  return (
    <>
      <div className="app-shell">
        <header>
          <div className="brand">
            <div className="brand-mark">F</div>
            <div>
              <strong>FRAME</strong>
              <small>SLIDE STUDIO</small>
            </div>
          </div>
          <div className="document-title">
            <input
              aria-label="プレゼンテーション名"
              value={deck.title}
              onChange={(event) =>
                changeDeck((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
            <span>
              {deck.slides.length} slides · {templateInfo.label}
            </span>
          </div>
          <div className="header-actions">
            <input
              ref={jsonFileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => importJson(event.target.files?.[0])}
            />
            <button
              className="ghost"
              onClick={() => jsonFileRef.current?.click()}
            >
              <FileInput size={16} />
              JSONインポート
            </button>
            <button className="ghost" onClick={save} disabled={!ready}>
              <Save size={16} />
              保存
            </button>
            <button className="primary" onClick={startPresentation}>
              <MonitorPlay size={16} />
              プレゼン
            </button>
          </div>
        </header>
        <main>
          <aside className="slide-rail">
            <div className="rail-heading">
              <span>スライド一覧</span>
              <button onClick={addSlide} title="スライドを追加">
                <Plus size={17} />
              </button>
            </div>
            <div
              className="panel-tabs rail-tabs"
              role="tablist"
              aria-label="左パネルの表示"
            >
              <button
                role="tab"
                aria-selected={railTab === "outline"}
                className={railTab === "outline" ? "active" : ""}
                onClick={() => setRailTab("outline")}
              >
                <ListOrdered size={14} />
                目次
              </button>
              <button
                role="tab"
                aria-selected={railTab === "thumbnails"}
                className={railTab === "thumbnails" ? "active" : ""}
                onClick={() => setRailTab("thumbnails")}
              >
                <LayoutGrid size={14} />
                サムネイル
              </button>
            </div>
            {railTab === "outline" ? (
              <div className="outline-list">
                {deck.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    className={`outline-item ${slide.id === activeId ? "active" : ""} ${slide.hidden ? "is-hidden" : ""}`}
                    onClick={() => {
                      selectSlide(slide.id);
                      setViewMode("slide");
                    }}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{slideTitle(slide, index)}</strong>
                    {slide.hidden && <EyeOff size={13} aria-label="非表示" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="thumbnails">
                {deck.slides.map((slide, index) => (
                  <div
                    className={`thumb-row ${slide.id === activeId ? "active" : ""} ${slide.hidden ? "is-hidden" : ""}`}
                    key={slide.id}
                    draggable
                    onDragStart={() => setDraggedId(slide.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reorder(slide.id)}
                  >
                    <span className="thumb-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <button
                      className="thumb"
                      onClick={() => {
                        selectSlide(slide.id);
                        setViewMode("slide");
                      }}
                    >
                      <SlideCanvas slide={slide} template={deck.template} />
                    </button>
                    <button
                      className="thumb-delete"
                      onClick={() => deleteSlide(slide.id)}
                      aria-label={`${index + 1}枚目を削除`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="add-slide" onClick={addSlide}>
              <Plus size={16} />
              スライドを追加
            </button>
          </aside>
          <section className="workspace">
            <div className="workspace-bar">
              <div
                className="view-switch"
                role="tablist"
                aria-label="スライドの表示形式"
              >
                <button
                  role="tab"
                  aria-selected={viewMode === "slide"}
                  className={viewMode === "slide" ? "active" : ""}
                  onClick={() => setViewMode("slide")}
                >
                  スライド
                </button>
                <button
                  role="tab"
                  aria-selected={viewMode === "grid"}
                  className={viewMode === "grid" ? "active" : ""}
                  onClick={() => setViewMode("grid")}
                >
                  一覧
                </button>
                <button
                  role="tab"
                  aria-selected={viewMode === "scroll"}
                  className={viewMode === "scroll" ? "active" : ""}
                  onClick={() => setViewMode("scroll")}
                >
                  スクロール
                </button>
              </div>
              <span>
                {activeIndex + 1} / {deck.slides.length}
              </span>
            </div>
            {viewMode === "slide" ? (
              <div
                className={`canvas-wrap ${activeSlide.hidden ? "is-hidden" : ""}`}
              >
                <SlideCanvas
                  slide={activeSlide}
                  template={deck.template}
                  editable
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onTextChange={(id, text) =>
                    updateElement(id, { text } as Partial<TextElement>)
                  }
                />
              </div>
            ) : (
              <div
                className={`multi-slide-view ${viewMode === "grid" ? "grid-view" : "scroll-view"}`}
              >
                {deck.slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`multi-slide-item ${slide.id === activeId ? "active" : ""} ${slide.hidden ? "is-hidden" : ""}`}
                    draggable={viewMode === "grid"}
                    onDragStart={() => setDraggedId(slide.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={(event) => {
                      if (viewMode === "grid") event.preventDefault();
                    }}
                    onDrop={() => {
                      if (viewMode === "grid") reorder(slide.id);
                    }}
                  >
                    <button
                      className="multi-slide-heading"
                      onClick={() => selectSlide(slide.id)}
                    >
                      <span>
                        {String(index + 1).padStart(2, "0")} ·{" "}
                        {slideTitle(slide, index)}
                      </span>
                      {slide.hidden && <span>非表示</span>}
                    </button>
                    <button
                      className="multi-slide-preview"
                      onClick={() => {
                        selectSlide(slide.id);
                        if (viewMode === "grid") setViewMode("slide");
                      }}
                    >
                      <SlideCanvas slide={slide} template={deck.template} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {viewMode === "slide" && (
              <p className="edit-hint">
                {activeSlide.hidden
                  ? "このスライドは発表・PDFから除外されます"
                  : "テキストを直接編集 · 要素を選ぶと右側で位置を調整できます"}
              </p>
            )}
          </section>
          <aside className="properties">
            <div
              className="panel-tabs right-tabs"
              role="tablist"
              aria-label="右パネルの表示"
            >
              <button
                role="tab"
                aria-selected={panelTab === "edit"}
                className={panelTab === "edit" ? "active" : ""}
                onClick={() => setPanelTab("edit")}
              >
                編集
              </button>
              <button
                role="tab"
                aria-selected={panelTab === "notes"}
                className={panelTab === "notes" ? "active" : ""}
                onClick={() => setPanelTab("notes")}
              >
                メモ・修正指示
              </button>
            </div>
            {panelTab === "edit" ? (
              <>
                <div className="panel-section">
                  <h3>デザイン</h3>
                  <div className="template-list">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        className={
                          deck.template === template.id ? "selected" : ""
                        }
                        onClick={() =>
                          changeDeck((current) => ({
                            ...current,
                            template: template.id,
                          }))
                        }
                      >
                        <span
                          className={`template-swatch swatch-${template.id}`}
                        />
                        <span>
                          <strong>{template.label}</strong>
                          <small>{template.description}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="panel-section">
                  <h3>要素を追加</h3>
                  <div className="element-actions">
                    <button
                      onClick={() =>
                        addElement(
                          makeText("新しいテキスト", 1.1, 3.1, 6.5, 0.7, 24),
                        )
                      }
                    >
                      <Type size={16} />
                      テキスト
                    </button>
                    <button
                      onClick={() =>
                        addElement({
                          id: crypto.randomUUID(),
                          type: "shape",
                          shape: "rect",
                          x: 9.5,
                          y: 5.2,
                          width: 1.5,
                          height: 0.7,
                          style: { fill: "#e15c30" },
                        })
                      }
                    >
                      <Shapes size={16} />
                      図形
                    </button>
                  </div>
                  <input
                    ref={imageFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(event) => uploadImage(event.target.files?.[0])}
                  />
                  <button
                    className="upload-zone"
                    onClick={() => imageFileRef.current?.click()}
                  >
                    <ImageIcon size={22} />
                    <strong>
                      {selected?.type === "image"
                        ? "選択中の画像を差し替える"
                        : "画像を追加する"}
                    </strong>
                    <span>PNG / JPG / WebP</span>
                  </button>
                </div>
                {selected && (
                  <div className="panel-section">
                    <h3>選択中の要素 · {selected.type}</h3>
                    <div className="geometry-grid">
                      {(["x", "y", "width", "height"] as const).map((key) => (
                        <label key={key}>
                          {key}
                          <input
                            type="number"
                            step="0.1"
                            value={selected[key]}
                            onChange={(event) =>
                              updateGeometry(key, Number(event.target.value))
                            }
                          />
                        </label>
                      ))}
                    </div>
                    {selected.type === "text" && (
                      <label className="font-size-field">
                        文字サイズ (pt)
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={selected.style.fontSize}
                          onChange={(event) =>
                            updateElement(selected.id, {
                              style: {
                                ...selected.style,
                                fontSize: Math.max(
                                  1,
                                  Number(event.target.value) || 1,
                                ),
                              },
                            } as Partial<TextElement>)
                          }
                        />
                      </label>
                    )}
                    <button className="remove-image" onClick={deleteSelected}>
                      <Trash2 size={14} />
                      この要素を削除
                    </button>
                  </div>
                )}
                <div className="panel-section">
                  <h3>作成と出力</h3>
                  <button
                    className="action-row"
                    onClick={() => setScriptOpen(true)}
                  >
                    <Sparkles size={17} />
                    <span>
                      <strong>文章から下書き</strong>
                      <small>段落ごとにスライドへ分割</small>
                    </span>
                  </button>
                  <button className="action-row" onClick={printDeck}>
                    <Download size={17} />
                    <span>
                      <strong>PDF / 印刷</strong>
                      <small>ブラウザの印刷画面でPDF保存</small>
                    </span>
                  </button>
                  <button className="action-row" onClick={exportJson}>
                    <FileText size={17} />
                    <span>
                      <strong>JSONエクスポート</strong>
                      <small>外部チームと共通の形式</small>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="notes-panel">
                <div className="panel-section">
                  <h3>スライドの表示</h3>
                  <button
                    className={`visibility-toggle ${activeSlide.hidden ? "hidden" : ""}`}
                    onClick={() =>
                      changeSlide((slide) => ({
                        ...slide,
                        hidden: !slide.hidden,
                      }))
                    }
                  >
                    {activeSlide.hidden ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                    {activeSlide.hidden
                      ? "非表示を解除する"
                      : "発表・PDFで非表示にする"}
                  </button>
                  <p className="panel-help">
                    非表示でも編集・JSON保存はできます。
                  </p>
                </div>
                <div className="panel-section">
                  <h3>メモ・修正指示を追加</h3>
                  <div
                    className="note-kinds"
                    role="group"
                    aria-label="メモの種類"
                  >
                    {(["revision", "question", "memo"] as const).map((kind) => (
                      <button
                        key={kind}
                        className={noteKind === kind ? "active" : ""}
                        onClick={() => setNoteKind(kind)}
                      >
                        {noteLabels[kind]}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="note-input"
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="このスライドへの内容を入力"
                  />
                  <button className="primary note-add" onClick={addNote}>
                    <Plus size={15} />
                    追加する
                  </button>
                </div>
                <div className="panel-section">
                  <h3>このスライドの項目 · {activeSlide.notes.length}件</h3>
                  {activeSlide.notes.length === 0 ? (
                    <p className="panel-help">まだ項目はありません。</p>
                  ) : (
                    <div className="note-list">
                      {activeSlide.notes.map((note) => (
                        <div
                          key={note.id}
                          className={`note-card ${note.completed ? "completed" : ""}`}
                        >
                          <div>
                            <span className={`note-kind kind-${note.kind}`}>
                              {noteLabels[note.kind]}
                            </span>
                            <button
                              className="note-check"
                              onClick={() => toggleNote(note.id)}
                              aria-label={
                                note.completed ? "未完了に戻す" : "完了にする"
                              }
                              aria-pressed={note.completed}
                            >
                              {note.completed && <Check size={13} />}
                            </button>
                          </div>
                          <p>{note.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </main>
        {scriptOpen && (
          <div
            className="modal-backdrop"
            onMouseDown={() => setScriptOpen(false)}
          >
            <div
              className="script-modal"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setScriptOpen(false)}
              >
                <X size={19} />
              </button>
              <div className="modal-kicker">
                <Sparkles size={15} /> TEXT DRAFT
              </div>
              <h2>文章を、スライドの骨格に。</h2>
              <p>
                空行で区切った段落を1枚ずつ配置します。AIによる内容生成は未接続です。
              </p>
              <textarea
                autoFocus
                value={script}
                onChange={(event) => setScript(event.target.value)}
                placeholder={"見出し\n説明文\n\n次の見出し\n次の説明文"}
              />
              <div className="modal-footer">
                <span>{script.length}文字</span>
                <button className="primary large" onClick={generateDraft}>
                  <Sparkles size={17} />
                  下書きを作成
                </button>
              </div>
            </div>
          </div>
        )}
        {presenting && (
          <div
            className="presentation"
            onClick={() =>
              setPresentIndex((index) =>
                Math.min(visibleSlides.length - 1, index + 1),
              )
            }
          >
            <button
              className="presentation-close"
              onClick={(event) => {
                event.stopPropagation();
                setPresenting(false);
              }}
            >
              <X />
            </button>
            <div className="presentation-slide">
              <SlideCanvas
                slide={visibleSlides[presentIndex]}
                template={deck.template}
              />
            </div>
            <div
              className="presentation-controls"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={() =>
                  setPresentIndex((index) => Math.max(0, index - 1))
                }
                disabled={presentIndex === 0}
              >
                <ChevronLeft />
              </button>
              <span>
                {presentIndex + 1} / {visibleSlides.length}
              </span>
              <button
                onClick={() =>
                  setPresentIndex((index) =>
                    Math.min(visibleSlides.length - 1, index + 1),
                  )
                }
                disabled={presentIndex === visibleSlides.length - 1}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
      <div className="print-root" aria-hidden="true">
        {visibleSlides.map((slide) => (
          <div className="print-page" key={slide.id}>
            <SlideCanvas slide={slide} template={deck.template} />
          </div>
        ))}
      </div>
    </>
  );
}
