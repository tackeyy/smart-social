-- =============================================================================
-- Migration: 20260516000003_indexes.sql
-- Description: All index definitions for smart-social
-- =============================================================================

-- ---------------------------------------------------------------------------
-- x_accounts
-- ---------------------------------------------------------------------------

-- ユーザー別 X アカウント一覧（RLS と同じ述語、プラン最適化）
CREATE INDEX idx_x_accounts_user_id
    ON x_accounts (user_id);

-- X user_id での検索（OAuth コールバック時の重複チェック）
CREATE INDEX idx_x_accounts_x_user_id
    ON x_accounts (x_user_id);

-- ---------------------------------------------------------------------------
-- drafts
-- ---------------------------------------------------------------------------

-- ユーザー別下書き一覧（最新順）
CREATE INDEX idx_drafts_user_id_created_at
    ON drafts (user_id, created_at DESC);

-- ステータス別フィルタ（pending/approved 絞り込みに利用）
CREATE INDEX idx_drafts_status
    ON drafts (status)
    WHERE status IN ('pending', 'approved');

-- X アカウント別下書き（アカウント切替時の一覧）
CREATE INDEX idx_drafts_x_account_id
    ON drafts (x_account_id);

-- scheduled_at: スケジュール予定時刻でのソート・範囲検索
CREATE INDEX idx_drafts_scheduled_at
    ON drafts (scheduled_at)
    WHERE scheduled_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- scheduled_posts
-- ---------------------------------------------------------------------------

-- Vercel Cron: pending かつ scheduled_at <= now() を高速抽出
-- M-2: retry_count < 3 の未達上限レコードを絞り込むためのインデックス
CREATE INDEX idx_scheduled_posts_pending_due
    ON scheduled_posts (scheduled_at)
    WHERE status = 'pending' AND retry_count < 3;

-- draft_id でのルックアップ（UNIQUE 制約のカバーインデックス補完）
CREATE INDEX idx_scheduled_posts_draft_id
    ON scheduled_posts (draft_id);

-- failed ステータスの集計・モニタリング用
CREATE INDEX idx_scheduled_posts_failed
    ON scheduled_posts (updated_at DESC)
    WHERE status = 'failed';

-- ---------------------------------------------------------------------------
-- reply_drafts
-- ---------------------------------------------------------------------------

-- ユーザー別返信下書き一覧（最新順）
CREATE INDEX idx_reply_drafts_user_id_created_at
    ON reply_drafts (user_id, created_at DESC);

-- X アカウント別（アカウント切替時）
CREATE INDEX idx_reply_drafts_x_account_id
    ON reply_drafts (x_account_id);

-- source_tweet_id での重複防止チェック・検索
CREATE INDEX idx_reply_drafts_source_tweet_id
    ON reply_drafts (source_tweet_id);

-- draft_candidates JSONB の GIN インデックス
-- generated_by や text の @> クエリに対応（Phase 2 以降の高度検索用）
CREATE INDEX idx_reply_drafts_candidates_gin
    ON reply_drafts USING gin (draft_candidates);
