## 背景

ページ見出し、カード角丸、影、文字サイズが画面ごとに揺れている。Stripe風のデザインシステムを中心にするなら、コンポーネントプリミティブ側で揃えるべき。

## 設計

- visual thesis: 6px radius、薄い境界、控えめな影、明確な本文階層で統一する。
- content plan: ページヘッダー、カード、フォーム、テーブル、タブの基本スタイルを統一する。
- interaction thesis: focus ringとhoverを同じ濃度で統一する。

## 対象

- `components/ui/card.tsx`
- `components/ui/button.tsx`
- `app/globals.css`
- 各dashboard page

## 修正方針

- `Card` のデフォルトを `rounded-[6px] border-manavi-border shadow-manavi-sm` に寄せる。
- ページ見出しを `text-xl font-semibold tracking-[-0.02em] text-manavi-navy` に統一する。
- 任意の `rounded-lg`、`rounded-md` の乱用を整理する。

## 受け入れ条件

- 主要dashboard画面でカード半径/影/境界が揃う。
- 見出しサイズが画面ごとに不自然に変わらない。
- 既存テストが通る。

