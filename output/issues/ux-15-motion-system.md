## 背景

LPにはheroの入口/floatがあるが、プロダクトUI側の状態変化やタブ切替、カードhoverの動きは最小限。Stripe風の「軽い反応」は足せる余地がある。

## 設計

- visual thesis: 目立つアニメーションではなく、操作に対する微細な応答で品質感を出す。
- content plan: ボタン、カードhover、Dialog、タブ/segmented controlに限定する。
- interaction thesis: 150〜220ms、opacity/transform中心、layout shiftなし。

## 対象

- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/dialog.tsx`
- dashboard tabs/buttons

## 修正方針

- Buttonのhover/active/focusを統一する。
- Card hoverが必要なリンクカードだけに軽いtranslate/shadowを付与する。
- Dialogとメニューに控えめなenter/exit transitionを追加する。
- `prefers-reduced-motion` を尊重する。

## 受け入れ条件

- 主要操作の反応が一貫する。
- 装飾的に動きすぎない。
- `prefers-reduced-motion` で動きが抑制される。

