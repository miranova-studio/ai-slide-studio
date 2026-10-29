# 講座JSON仕様（schemaVersion 5）

講座全体を1つのJSONにします。`src/schema/slide-deck.schema.json` が機械検証用の正本です。サンプルは `docs/examples/course-sample.json`。外部のAIが内容を生成するときはこの構造に合わせ、アプリの「JSONインポート」で読み込みます。アプリ内のAI生成・音声合成は行いません。

ルートは通常のスライドJSONと共通で、`mode: "course"` と `course` を追加します。`slides` は編集対象の実データ、`course.sections[].lectures[].slideIds` は表示・書き出し順序です。講座モードでは全スライドIDを重複なく、ちょうど1回ずつ参照してください。セクションとレクチャーは `id` と `title` を持ちます。

`course` は `subtitle`（サブタイトル）、`audience`（対象者）、`objectives`（学習目標の文字列配列）、`prerequisites`（前提知識の文字列配列）、`description`（講座説明文）、`charactersPerMinute`（日本語の話速、初期値300）、`sections` を持ちます。

各スライドの `narration` はそのスライドのナレーション台本です。目安時間はUnicode文字数÷`charactersPerMinute`×60秒です。`audio` がある場合、実音声の `durationSeconds` を優先します。`audio` は `id`、`filename`、`mimeType`、`kind`（`ai`/`self`）、`durationSeconds` を持つメタデータで、音声本体はIndexedDBに保存されます。JSON単体では音声ファイルは含まれません。

旧schemaVersion 1〜4のスライドJSONは `mode: "deck"`、空の台本として移行します。講座に変えると、既存スライドを1セクション・1レクチャーにまとめます。スライド要素の16:9座標とスタイルは [スライド仕様](slide-schema.md) を参照してください。

書き出し時の台本ファイル名は `S01-L02-03.txt`（セクション01・レクチャー02・その中のスライド03）です。同じ幹の `mp3` / `wav` / `m4a` を一括取り込みすると、現在の目次順序に基づいて自動割当します。台本ZIPには `scripts/` と `scripts-index.csv`（UTF-8 BOM付き）が入り、CSVは単独でも出せます。講座一式ZIPには `course.json`、一覧CSV、講座説明文、セクション／レクチャー順のフォルダごとに台本・音声・`slides.pdf` が入ります。現時点でZIP全体の再インポートは未対応です。
