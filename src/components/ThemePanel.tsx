import { useMemo, useState } from "react";
import paletteData from "../data/miranova-palettes.json";
import type { MiranovaPalette, PaletteMapping, Theme } from "../themes";
import { parsePalettePaste } from "../themes";

const palettes = paletteData as MiranovaPalette[];
type Props = {
  themes: Theme[];
  themeId: string;
  mapping: PaletteMapping;
  paletteId?: string;
  onTheme: (theme: Theme) => void;
  onPalette: (palette: MiranovaPalette, mapping: PaletteMapping) => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onSave: (name: string) => void;
  onSaveToFolder: (name: string) => void;
  notify: (message: string) => void;
};
export function ThemePanel({
  themes,
  themeId,
  mapping,
  paletteId,
  onTheme,
  onPalette,
  onImport,
  onExport,
  onSave,
  onSaveToFolder,
  notify,
}: Props) {
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [purpose, setPurpose] = useState("");
  const [query, setQuery] = useState("");
  const [paste, setPaste] = useState("");
  const [customPalette, setCustomPalette] = useState<MiranovaPalette | null>(
    null,
  );
  const [name, setName] = useState("");
  const categories = useMemo(
    () => [...new Set(palettes.map((item) => item.category))].sort(),
    [],
  );
  const tags = useMemo(
    () => [...new Set(palettes.flatMap((item) => item.tags))].sort(),
    [],
  );
  const purposes = useMemo(
    () => [...new Set(palettes.flatMap((item) => item.purposes))].sort(),
    [],
  );
  const filtered = useMemo(
    () =>
      palettes.filter(
        (item) =>
          (!category || item.category === category) &&
          (!tag || item.tags.includes(tag)) &&
          (!purpose || item.purposes.includes(purpose)) &&
          (!query ||
            `${item.name} ${item.id}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [category, tag, purpose, query],
  );
  const current =
    palettes.find((item) => item.id === paletteId) ||
    (paletteId === "custom" ? customPalette : null);
  function remap(
    key: keyof PaletteMapping,
    value: PaletteMapping[keyof PaletteMapping],
  ) {
    const next = { ...mapping, [key]: value };
    if (current) onPalette(current, next);
  }
  function importPaste() {
    try {
      const colors = parsePalettePaste(paste);
      const imported = {
        id: "custom",
        name: "貼り付けパレット",
        category: "カスタム",
        tags: [],
        purposes: [],
        ...colors,
      };
      setCustomPalette(imported);
      onPalette(imported, mapping);
      notify("貼り付けた3色を適用しました");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "色を読み取れませんでした",
      );
    }
  }
  return (
    <div className="theme-panel">
      <div className="panel-section">
        <h3>テーマ</h3>
        <p className="panel-help">文字・画像を残してデザインを切り替えます。</p>
        <div className="theme-options">
          {themes.map((theme) => (
            <button
              key={theme.id}
              className={theme.id === themeId ? "active" : ""}
              onClick={() => onTheme(theme)}
            >
              <span
                className="theme-mini"
                style={{
                  background: theme.palette.background,
                  borderColor: theme.palette.main,
                }}
              >
                <i style={{ background: theme.palette.main }} />
                <b style={{ background: theme.palette.accent }} />
              </span>
              <span>
                <strong>{theme.name}</strong>
                <small>{theme.category}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="panel-section">
        <h3>MIRANOVAパレットから選ぶ</h3>
        <p className="panel-help">
          Base 70 / Sub 25 / Accent 5 を目安に適用します。
        </p>
        <input
          className="theme-search"
          aria-label="パレット名を検索"
          placeholder="名前・IDで検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="palette-filters">
          <select
            aria-label="カテゴリで絞り込み"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">全カテゴリ</option>
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="タグで絞り込み"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
          >
            <option value="">全タグ</option>
            {tags.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="用途で絞り込み"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          >
            <option value="">全用途</option>
            {purposes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <small>{filtered.length}件</small>
        <div className="palette-results">
          {filtered.map((item) => (
            <button
              key={item.id}
              className={paletteId === item.id ? "active" : ""}
              onClick={() => onPalette(item, mapping)}
              title={item.description}
            >
              <span className="palette-swatches">
                <i style={{ background: item.base }} />
                <i style={{ background: item.sub }} />
                <i style={{ background: item.accent }} />
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.id} · {item.category}
                </small>
              </span>
            </button>
          ))}
        </div>
        <h4>色の割り当て</h4>
        {(["background", "main", "accent"] as const).map((key) => (
          <label className="mapping-row" key={key}>
            {key === "background"
              ? "背景"
              : key === "main"
                ? "メイン"
                : "アクセント"}
            <select
              value={mapping[key]}
              onChange={(event) =>
                remap(key, event.target.value as PaletteMapping[typeof key])
              }
            >
              <option value="base">Base</option>
              <option value="sub">Sub</option>
              <option value="accent">Accent</option>
            </select>
          </label>
        ))}
        <p className="panel-help">
          文字色は背景とのコントラスト比4.5:1以上になる黒／白を自動選択します。
        </p>
      </div>
      <div className="panel-section">
        <h3>汎用パレットの取り込み</h3>
        <textarea
          aria-label="JSON・CSS変数・HEXを貼り付け"
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          placeholder={
            '{"base":"#ffffff","sub":"#112233","accent":"#ff5500"}\nまたは CSS変数・HEX 3色'
          }
        />
        <button onClick={importPaste}>3色を適用</button>
      </div>
      <div className="panel-section">
        <h3>テーマファイル</h3>
        <input
          aria-label="新しいテーマ名"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="新しいテーマ名"
        />
        <button onClick={() => onSave(name)}>
          現在のテーマを新規保存・JSON書き出し
        </button>
        <button onClick={() => onSaveToFolder(name)}>
          themes/ に保存（フォルダ選択）
        </button>
        <button onClick={onExport}>テーマJSONを書き出す</button>
        <label className="theme-import">
          テーマJSONをインポート
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.target.value = "";
            }}
          />
        </label>
        <p className="panel-help">
          保存したテーマはブラウザ内にも保持します。ソース管理するには themes/
          を選ぶか、書き出したJSONを配置してください。
        </p>
      </div>
    </div>
  );
}
