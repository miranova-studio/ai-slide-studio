import { useEffect, useState } from "react";
import { normalizeHexColor } from "../colors";

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
  useEffect(() => setDraft(value), [value]);
  const validDraft = normalizeHexColor(draft);
  const choose = (color: string) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    onColorChange(normalized);
    onRememberColor(normalized);
    setDraft(normalized);
  };
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
