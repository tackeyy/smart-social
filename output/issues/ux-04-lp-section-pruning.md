## 背景

LPはProblem、Workflow、Features、Positioning、Trust、FAQ、CTAが並び、各セクションの主張が一部重複している。読みやすい一方で、検討からCTAまでの勢いが弱まっている。

## 設計

- visual thesis: 余白を活かし、少ないセクションで強く伝えるStripe風の編集密度にする。
- content plan: Hero、Workflow、Differentiation、Pricing、FAQ、Final CTAに再編する。
- interaction thesis: セクション間の動きは淡いreveal程度に留める。

## 対象

- `app/page.tsx`

## 修正方針

- ProblemとPositioningを統合し、比較/差別化セクションとして再設計する。
- FeaturesはWorkflow内に吸収できるものを削る。
- Trustは料金/CTA付近の小さな保証行として圧縮する。
- コピーを30%程度削り、各セクションの役割を明確化する。

## 受け入れ条件

- 各セクションが「説明」「証拠」「比較」「変換」のいずれか1つの役割を持つ。
- 同じ価値訴求が複数セクションで繰り返されない。
- デスクトップ全ページのスクロール量が現状より短くなる。

