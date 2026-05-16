-- =============================================================================
-- Migration: 20260516000001_initial_schema.sql
-- Description: Initial schema for smart-social
--              Includes M-2 (retry_count/last_error) and M-3 (draft_candidates COMMENT)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM Types
-- ---------------------------------------------------------------------------

CREATE TYPE draft_status AS ENUM ('pending', 'approved', 'rejected', 'posted');
CREATE TYPE post_status   AS ENUM ('pending', 'posted', 'failed');

-- ---------------------------------------------------------------------------
-- Table: x_accounts
-- X (Twitter) アカウント情報
-- ---------------------------------------------------------------------------
CREATE TABLE x_accounts (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    x_user_id  TEXT        NOT NULL,          -- X の数値 user_id (string 保持)
    screen_name TEXT       NOT NULL,           -- @ハンドル（@ なし）
    access_token       TEXT NOT NULL,
    access_token_secret TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_x_accounts_user_x UNIQUE (user_id, x_user_id)
);

COMMENT ON TABLE  x_accounts IS 'ユーザーが連携した X アカウント';
COMMENT ON COLUMN x_accounts.x_user_id IS 'X API が返す数値 user_id（変更されないため主キー代理として使用）';
COMMENT ON COLUMN x_accounts.screen_name IS '@ハンドル（@ を除いた文字列）';

-- ---------------------------------------------------------------------------
-- Table: drafts
-- 投稿下書き（AI 生成 or 手動作成）
-- ---------------------------------------------------------------------------
CREATE TABLE drafts (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    x_account_id BIGINT       NOT NULL REFERENCES x_accounts (id) ON DELETE CASCADE,
    content      TEXT         NOT NULL,
    status       draft_status NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ,
    posted_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_drafts_posted_at CHECK (
        posted_at IS NULL OR status = 'posted'
    )
);

COMMENT ON TABLE  drafts IS '投稿下書き。AI 生成 / 手動作成を問わず全件格納';
COMMENT ON COLUMN drafts.status IS 'pending=未承認, approved=承認済み, rejected=却下, posted=投稿済み';

-- ---------------------------------------------------------------------------
-- Table: scheduled_posts
-- 承認済み下書きのスケジュール投稿管理
-- M-2: retry_count / last_error カラム追加
-- ---------------------------------------------------------------------------
CREATE TABLE scheduled_posts (
    id           BIGSERIAL   PRIMARY KEY,
    draft_id     BIGINT      NOT NULL REFERENCES drafts (id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    posted_at    TIMESTAMPTZ,
    status       post_status NOT NULL DEFAULT 'pending',

    -- M-2: リトライ制御
    retry_count  INTEGER     NOT NULL DEFAULT 0,
    last_error   TEXT,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_scheduled_posts_draft UNIQUE (draft_id),
    CONSTRAINT chk_scheduled_posts_posted_at CHECK (
        posted_at IS NULL OR status = 'posted'
    ),
    CONSTRAINT retry_limit CHECK (retry_count <= 3)
);

COMMENT ON TABLE  scheduled_posts IS 'スケジュール投稿キュー。1 draft につき 1 レコード';
COMMENT ON COLUMN scheduled_posts.retry_count IS 'X API 投稿失敗時の再試行回数。上限は retry_limit 制約（3 回）';
COMMENT ON COLUMN scheduled_posts.last_error  IS '直近の投稿失敗エラーメッセージ。成功時は NULL にリセット';

-- ---------------------------------------------------------------------------
-- Table: reply_drafts
-- 返信候補の AI 生成下書き
-- M-3: draft_candidates JSONB 構造を COMMENT で定義
-- ---------------------------------------------------------------------------
CREATE TABLE reply_drafts (
    id                BIGSERIAL   PRIMARY KEY,
    user_id           UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    x_account_id      BIGINT      NOT NULL REFERENCES x_accounts (id) ON DELETE CASCADE,
    source_tweet_id   TEXT        NOT NULL,   -- 返信元ツイート ID
    source_tweet_text TEXT        NOT NULL,   -- 返信元ツイート本文（スナップショット）
    draft_candidates  JSONB       NOT NULL DEFAULT '[]'::JSONB,
    selected_index    SMALLINT,               -- ユーザーが選択した候補インデックス (0-based)
    posted_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_reply_drafts_selected_index CHECK (
        selected_index IS NULL OR selected_index >= 0
    )
);

-- M-3: draft_candidates JSONB 構造の定義
COMMENT ON TABLE  reply_drafts IS '返信候補 AI 生成下書き。1 ツイートに対して複数候補を保持';
COMMENT ON COLUMN reply_drafts.draft_candidates IS '
AI 生成の返信候補リスト。JSON Schema:
[
  {
    "text":         "string  — 返信本文（140文字以内を推奨）",
    "generated_by": "string  — 生成モデル識別子 (例: claude-sonnet-4-6)",
    "created_at":   "string  — ISO 8601 形式のタイムスタンプ (例: 2026-05-16T00:00:00Z)"
  }
]
';
COMMENT ON COLUMN reply_drafts.source_tweet_id IS '返信元ツイートの X 数値 ID（文字列保持）';
COMMENT ON COLUMN reply_drafts.selected_index  IS 'ユーザーが承認した draft_candidates 内のインデックス (0-based)。未選択は NULL';

-- ---------------------------------------------------------------------------
-- updated_at 自動更新 TRIGGER（全テーブル共通）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_x_accounts_updated_at
    BEFORE UPDATE ON x_accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_drafts_updated_at
    BEFORE UPDATE ON drafts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_scheduled_posts_updated_at
    BEFORE UPDATE ON scheduled_posts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_reply_drafts_updated_at
    BEFORE UPDATE ON reply_drafts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
