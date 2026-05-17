## 背景

アカウント管理で `confirm` / `alert` を使っており、既存のStripe風UIやshadcn/Radixベースの体験から外れている。

## 設計

- visual thesis: 危険操作もプロダクト内の同じトーンで扱う。
- content plan: 確認Dialog、説明、キャンセル、連携解除。
- interaction thesis: DialogはRadixの既存コンポーネントで開閉し、結果はSonner toastで通知する。

## 対象

- `app/dashboard/accounts/AccountsClient.tsx`

## 修正方針

- `confirm` を `Dialog` に置き換える。
- `alert` を `toast.error` に置き換える。
- 解除対象のアカウント名をDialog本文に表示する。

## 受け入れ条件

- ネイティブブラウザダイアログが出ない。
- 削除失敗時はtoastでエラーが出る。
- キーボードでDialogを操作できる。

