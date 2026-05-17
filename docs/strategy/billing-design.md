# 課金設計：Stripe サブスクリプション

> 確定事項のみ記載。変更時はこのファイルを更新すること。

## プラン定義

| プラン | 月額（税抜） | 年額（税抜） | Stripe Price ID |
|--------|:----------:|:----------:|:---------------:|
| Free   | ¥0         | —          | —（Price不要）   |
| Pro    | ¥4,980     | ¥47,800    | 実装時に設定     |
| Business | ¥12,800  | ¥122,900   | 実装時に設定     |

年払いは2ヶ月分無料（月額×10ヶ月相当）。

## プランごとの機能制限

| 機能 | Free | Pro | Business |
|------|:----:|:---:|:--------:|
| Xアカウント連携 | 1 | 3 | 10 |
| AI生成（月次） | 10件 | 100件 | 無制限 |
| 文体プロファイル | ✗ | ✓ | ✓ |
| スケジュール投稿 | 月5件 | 無制限 | 無制限 |
| テンプレート | 3個 | 無制限 | 無制限 |
| Auto-plug | ✗ | ルール3個 | 無制限 |
| Evergreen | ✗ | ルール3個 | 無制限 |
| チームメンバー | 1名 | 1名 | 最大5名 |
| アナリティクス | 7日 | 90日 | 365日 |

## DB設計

```sql
-- subscriptions テーブル
CREATE TABLE subscriptions (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan                   TEXT NOT NULL DEFAULT 'free'
                         CHECK (plan IN ('free', 'pro', 'business')),
  status                 TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'incomplete')),
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## APIエンドポイント

| エンドポイント | 役割 |
|--------------|------|
| `POST /api/stripe/checkout` | チェックアウトセッション作成（未契約→Pro/Business） |
| `POST /api/stripe/portal` | Stripe Customer Portal（プラン変更・解約・請求履歴） |
| `POST /api/stripe/webhooks` | Webhook受信（サブスク状態をDBに同期） |

## Webhookで処理するイベント

| Stripeイベント | 処理内容 |
|--------------|---------|
| `checkout.session.completed` | subscriptionsにINSERT、planをpro/businessに更新 |
| `invoice.payment_succeeded` | current_period_endを更新 |
| `invoice.payment_failed` | statusをpast_dueに更新 |
| `customer.subscription.updated` | plan・status・cancel_at_period_endを同期 |
| `customer.subscription.deleted` | planをfreeに、statusをcanceledに更新 |

## 環境変数（追加が必要なもの）

```
STRIPE_SECRET_KEY=sk_test_...        # Stripeダッシュボードから取得
STRIPE_WEBHOOK_SECRET=whsec_...      # Webhook署名検証用
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_...
```

## 実装ステータス

- [x] `npm install stripe @stripe/stripe-js` 追加
- [x] マイグレーション：subscriptionsテーブル作成（`supabase/migrations/20260519000002_create_subscriptions.sql`）
- [x] `app/api/stripe/checkout/route.ts`
- [x] `app/api/stripe/portal/route.ts`
- [x] `app/api/stripe/webhooks/route.ts`
- [x] プラン制限チェックのユーティリティ関数（`lib/subscription.ts`）
- [x] `lib/stripe.ts`（遅延初期化Proxyパターン）
- [x] `types/subscription.ts`（Plan/Feature/PlanLimits型定義）
- [x] Stripe Dashboardでプロダクト・価格設定（curl API経由で作成済み）
- [x] 環境変数設定（.env.local + Vercel production/development）

## 修正履歴

| 日時 | 内容 |
|------|------|
| 2026-05-17 | 初版作成（プライシング確定：Pro ¥4,980 / Business ¥12,800） |
