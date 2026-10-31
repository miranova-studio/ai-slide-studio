import { useEffect, useRef, useState } from "react";
import { normalizeHexColor } from "../colors";
import { hexToHsv, hsvToHex } from "../colorMath";

export type ColorChoice = { label: string; color: string };

type Props = {
  label: string;
  value: string;
  themeColors: ColorChoice[];
  miranovaColors: ColorChoice[];
  recentColors: string[];
  onColorChange: (color: string) => void;
  onRememberColor: (color: string) => void;
  onNativeBegin?: () => void;
  onNativeEnd?: () => void;
};

function Swatches({ title, colors, onChoose }: {
  title: string;
  colors: ColorChoice[];
  onChoose: (color: string) => void;
}) {
  if (!colors.length) return null;
  return <div className="app-color-group">
    <strong>{title}</strong>
    <div className="app-color-swatches">
      {colors.map(({ label, color }) => <button
        type="button"
        key={`${title}-${label}-${color}`}
        className="app-color-swatch"
        style={{ backgroundColor: color }}
        title={`${label} ${color}`}
        aria-label={`${label} ${color}を選ぶ`}
        onClick={() => onChoose(color)}
      />)}
    </div>
  </div>;
}

export function ColorChooser({
  label, value, themeColors, miranovaColors, recentColors,
  onColorChange, onRememberColor, onNativeBegin, onNativeEnd,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const dragging = useRef(false);
  const [eyeDropperAvailable] = useState(() => typeof window !== "undefined" && "EyeDropper" in window);
  const [h, s, v] = hexToHsv(normalizeHexColor(value) || "#000000");
  useEffect(() => setDraft(value), [value]);
  const validDraft = normalizeHexColor(draft);
  const choose = (color: string) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    onColorChange(normalized);
    onRememberColor(normalized);
    setDraft(normalized);
  };
  const move = (event: React.PointerEvent<HTMLDivElement>, kind: "square" | "hue") => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    onColorChange(kind === "hue" ? hsvToHex(x * 360, s, v) : hsvToHex(h, x, 1 - y));
  };
  const pointer = (kind: "square" | "hue") => ({
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      onNativeBegin?.();
      move(event, kind);
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => { if (dragging.current) move(event, kind); },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      dragging.current = false;
      onNativeEnd?.();
      onRememberColor(hsvToHex(...hexToHsv(normalizeHexColor(value) || "#000000")));
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: () => { dragging.current = false; onNativeEnd?.(); },
  });
  return <div className="app-color-field">
    <div className="app-color-field-top">
      <label>{label}
        <input
          type="color"
          aria-label={label}
          value={normalizeHexColor(value) || "#000000"}
          onFocus={onNativeBegin}
          onBlur={onNativeEnd}
          onInput={(event) => onColorChange(event.currentTarget.value.toUpperCase())}
          onChange={(event) => choose(event.currentTarget.value)}
        />
      </label>
      <button type="button" className="app-color-open" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "アプリ内の色選びを閉じる" : "アプリ内で色を選ぶ"}
      </button>
    </div>
    {open && <div className="app-color-picker">
      <Swatches title="現在のテーマ" colors={themeColors} onChoose={choose} />
      <Swatches title="MIRANOVAパレット" colors={miranovaColors} onChoose={choose} />
      <Swatches title="最近使った色" colors={recentColors.map((color) => ({ label: color, color }))} onChoose={choose} />
      <div className="app-color-detail">
        <div className="app-color-square" role="slider" aria-label="鮮やかさと明るさ" aria-valuenow={Math.round(v * 100)} tabIndex={0} style={{ backgroundColor: hsvToHex(h, 1, 1) }} {...pointer("square") }>
          <span className="app-color-square-marker" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }} />
        </div>
        <div className="app-color-hue" role="slider" aria-label="色相" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(h)} tabIndex={0} {...pointer("hue")}>
          <span className="app-color-hue-marker" style={{ left: `${h / 3.6}%` }} />
        </div>
        {eyeDropperAvailable && <button type="button" onClick={async () => {
          try {
            const EyeDropperClass = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
            choose((await new EyeDropperClass().open()).sRGBHex);
          } catch { /* User canceled or the browser refused the request. */ }
        }}>スポイトで画面の色を選ぶ</button>}
      </div>
      <div className="app-color-hex">
        <label>HEXカラーコード
          <input
            type="text"
            value={draft}
            maxLength={7}
            placeholder="#RRGGBB"
            spellCheck={false}
            aria-invalid={draft.length > 0 && !validDraft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (validDraft) choose(validDraft);
              }
            }}
          />
        </label>
        <button type="button" disabled={!validDraft} onClick={() => validDraft && choose(validDraft)}>適用</button>
      </div>
      {draft.length > 0 && !validDraft && <p role="alert">#RRGGBB 形式で入力してください。</p>}
    </div>}
  </div>;
}
