-- =============================================================================
-- Migration: 20260519000002_create_subscriptions.sql
-- Description: Stripe サブスクリプション管理テーブル
--              Stripe Webhook 経由でのみ更新される（ユーザー直接変更不可）
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: subscriptions
-- ユーザーごとのサブスクリプション状態を管理する
--
-- 更新フロー:
--   Stripe Webhook → アプリケーションサーバー（service_role）→ このテーブル
--   ユーザーは SELECT のみ許可（INSERT/UPDATE はサービスロール限定）
-- ---------------------------------------------------------------------------

CREATE TABLE subscriptions (
    user_id                UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    stripe_customer_id     TEXT        UNIQUE NOT NULL,
    stripe_subscription_id TEXT        UNIQUE,
    plan                   TEXT        NOT NULL DEFAULT 'free'
                           CHECK (plan IN ('free', 'pro', 'business')),
    status                 TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'incomplete')),
    current_period_end     TIMESTAMPTZ,
    cancel_at_period_end   BOOLEAN     NOT NULL DEFAULT false,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  subscriptions IS 'Stripe サブスクリプション状態を管理するテーブル。Stripe Webhook 経由でのみ更新される';
COMMENT ON COLUMN subscriptions.user_id                IS 'auth.users への FK。1ユーザー1レコード（PK）';
COMMENT ON COLUMN subscriptions.stripe_customer_id     IS 'Stripe Customer ID（cus_xxx）';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe Subscription ID（sub_xxx）。free プランは NULL になりうる';
COMMENT ON COLUMN subscriptions.plan                   IS '契約プラン: free / pro / business';
COMMENT ON COLUMN subscriptions.status                 IS 'Stripe サブスクリプションのステータス: active / trialing / canceled / past_due / incomplete';
COMMENT ON COLUMN subscriptions.current_period_end     IS '現在の請求期間の終了日時（Stripe の current_period_end を UTC で保存）';
COMMENT ON COLUMN subscriptions.cancel_at_period_end   IS 'true = 期間終了時にキャンセル予約済み';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分のレコードのみ参照可能
CREATE POLICY subscriptions_select
    ON subscriptions
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: サービスロール（Stripe Webhook）のみ許可
-- RLS ポリシー未定義 = INSERT は RLS によりすべて拒否
-- service_role は RLS をバイパスするため、ポリシー定義は不要

-- UPDATE: サービスロール（Stripe Webhook）のみ許可
-- 同上：ユーザーロールからの UPDATE は RLS により拒否

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- stripe_customer_id は UNIQUE 制約でインデックス済みだが、Webhook 検索で頻出するため明示
CREATE INDEX idx_subscriptions_stripe_customer_id
    ON subscriptions (stripe_customer_id);

-- plan 別の絞り込み（管理画面・分析クエリ用）
CREATE INDEX idx_subscriptions_plan
    ON subscriptions (plan);
