## 背景

認証後ナビは10項目が横並びで、情報設計が重い。モバイルではアカウント選択、プラン、ユーザー情報が非表示になり、現在の操作文脈が消える。

## 設計

- visual thesis: Linear風に、主要作業へすぐ移動できる静かなナビにする。
- content plan: PrimaryはDashboard/Drafts/Schedule/Analytics、SecondaryはMentions/Accounts/Usage/Billing/Settingsへまとめる。
- interaction thesis: Moreメニューは軽いポップオーバー、モバイルはドロワーではなくシンプルな縦メニュー。

## 対象

- `components/NavBar.tsx`
- `app/dashboard/layout.tsx`

## 修正方針

- ナビ項目をPrimary/Secondaryに分ける。
- モバイルメニュー内にAccountSelector、PlanBadge、ユーザーemailを表示する。
- 現在ページは `aria-current` と背景色で示す。

## 受け入れ条件

- 1024px幅でもナビが窮屈に見えない。
- モバイルで現在アカウントとプランが確認できる。
- 主要4画面への導線が1クリックで残る。

