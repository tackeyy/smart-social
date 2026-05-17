## 背景

ScheduleとAnalyticsはモバイルで横スクロールテーブルに依存している。短期的には動くが、日常運用では確認・操作がしづらい。

## 設計

- visual thesis: モバイルではテーブルをカード化し、最重要情報を上から読める形にする。
- content plan: 1行=1カード、主情報、補助メトリクス、操作。
- interaction thesis: 詳細は展開、主操作はカード下部に固定する。

## 対象

- `app/dashboard/schedule/page.tsx`
- `app/dashboard/analytics/page.tsx`
- 必要に応じて共通 `ResponsiveTable` コンポーネント

## 修正方針

- `sm:hidden` のカード表示と `hidden sm:block` のテーブル表示に分ける。
- Scheduleは日時/本文/ステータス/キャンセルをカード化する。
- Analyticsは本文/主要メトリクス/スコア/登録アクションをカード化する。

## 受け入れ条件

- 390px幅で横スクロールなしに主要情報が読める。
- デスクトップでは既存テーブルの比較性を維持する。
- 操作ボタンのタップターゲットが44px以上である。

