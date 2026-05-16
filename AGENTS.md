<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your
training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git コミットルール

- issue を解決するコミットには必ず **`closes #N`** または **`fixes #N`** をコミットメッセージ本文に含める
  - `feat(#32): 投稿テンプレートライブラリを追加` のようなタイトルだけでは issue は自動クローズされない
  - 本文（body）に `Closes #32` を記載することで GitHub が自動クローズする
- 複数 issue を解決する場合はカンマ区切りで列挙する: `Closes #33, Closes #40`
- フォーマット例:
  ```
  fix(#33,#40): timeline 422→502, validate pagination_token format

  Closes #33
  Closes #40
  ```
