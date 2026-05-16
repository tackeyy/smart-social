-- =============================================================================
-- Migration: 20260517000010_unify_drafts_schema.sql
-- Description: Unify reply_drafts / scheduled_posts into drafts table
--              draft.type カラムで 'original' / 'reply' / 'thread' を区別
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: draft_status ENUM に値を追加
-- ---------------------------------------------------------------------------

ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'failed';

-- ---------------------------------------------------------------------------
-- Step 2: drafts テーブルにカラムを追加
-- ---------------------------------------------------------------------------

-- 投稿種別（必須・DEFAULT 'original' で既存行に影響なし）
ALTER TABLE drafts
    ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'original'
        CONSTRAINT chk_drafts_type CHECK (type IN ('original', 'reply', 'thread'));

-- リプライ元ツイート情報（reply 種別のみ）
ALTER TABLE drafts
    ADD COLUMN IF NOT EXISTS source_tweet_id   text;

ALTER TABLE drafts
    ADD COLUMN IF NOT EXISTS source_tweet_text text;

-- AI 生成候補リスト（reply 種別のみ）
ALTER TABLE drafts
    ADD COLUMN IF NOT EXISTS ai_candidates     jsonb;

-- 選択候補インデックス
ALTER TABLE drafts
    ADD COLUMN IF NOT EXISTS selected_index    smallint
        CONSTRAINT chk_drafts_selected_index CHECK (selected_index IS NULL OR selected_index >= 0);

-- スケジュール投稿リトライ制御
ALTER TABLE drafts
    ADD COLUMN IF NOT EXISTS retry_count       integer NOT NULL DEFAULT 0
        CONSTRAINT chk_drafts_retry_count CHECK (retry_count <= 3);

ALTER TABLE drafts
    ADD COLUMN IF NOT EXISTS last_error        text;

-- 投稿後の X tweet ID
ALTER TABLE drafts
    ADD COLUMN IF NOT EXISTS posted_tweet_id   text;

-- reply 種別の型整合性チェック制約
ALTER TABLE drafts
    ADD CONSTRAINT chk_drafts_reply_fields CHECK (
        type != 'reply'
        OR (source_tweet_id IS NOT NULL AND source_tweet_text IS NOT NULL)
    );

-- ---------------------------------------------------------------------------
-- Step 3: reply_drafts → drafts データ移行
--
-- reply_drafts には後のマイグレーション（migration 5）で追加された
-- status（reply_draft_status ENUM）、content、posted_tweet_id が存在する。
-- 開発初期のため実データ 0 件を想定するが、移行 SQL は堅牢に記述する。
-- ---------------------------------------------------------------------------

INSERT INTO drafts (
    user_id,
    x_account_id,
    content,
    type,
    source_tweet_id,
    source_tweet_text,
    ai_candidates,
    selected_index,
    posted_tweet_id,
    posted_at,
    -- reply_draft_status を draft_status にマッピング
    -- processing → processing, posted → posted, rejected → rejected, pending → pending
    status,
    created_at,
    updated_at
)
SELECT
    rd.user_id,
    rd.x_account_id,
    COALESCE(rd.content, ''),    -- content カラムが NULL の場合は空文字
    'reply'                      AS type,
    rd.source_tweet_id,
    rd.source_tweet_text,
    rd.draft_candidates          AS ai_candidates,
    rd.selected_index,
    CASE
        WHEN column_exists.has_posted_tweet_id THEN rd.posted_tweet_id
        ELSE NULL
    END                          AS posted_tweet_id,
    rd.posted_at,
    CASE rd.status::text
        WHEN 'processing' THEN 'processing'::draft_status
        WHEN 'posted'     THEN 'posted'::draft_status
        WHEN 'rejected'   THEN 'rejected'::draft_status
        ELSE                   'pending'::draft_status
    END                          AS status,
    rd.created_at,
    rd.updated_at
FROM reply_drafts rd
-- posted_tweet_id カラムの存在確認（動的）
CROSS JOIN LATERAL (
    SELECT EXISTS (
        SELECT 1
        FROM   information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'reply_drafts'
          AND  column_name  = 'posted_tweet_id'
    ) AS has_posted_tweet_id
) AS column_exists;

-- ---------------------------------------------------------------------------
-- Step 4: scheduled_posts → drafts データ移行
--
-- scheduled_posts の情報（scheduled_at, retry_count, last_error,
-- posted_tweet_id, status, posted_at）を対応する drafts 行に反映する。
-- UNIQUE 制約 uq_scheduled_posts_draft により draft_id は一意。
-- ---------------------------------------------------------------------------

UPDATE drafts d
SET
    scheduled_at    = sp.scheduled_at,
    retry_count     = sp.retry_count,
    last_error      = sp.last_error,
    posted_tweet_id = COALESCE(sp.posted_tweet_id, d.posted_tweet_id),
    posted_at       = COALESCE(sp.posted_at, d.posted_at),
    -- post_status を draft_status にマッピング
    -- processing → processing, posted → posted, failed → failed
    -- pending (scheduled_at 設定済み) → scheduled
    status          = CASE sp.status::text
                          WHEN 'processing' THEN 'processing'::draft_status
                          WHEN 'posted'     THEN 'posted'::draft_status
                          WHEN 'failed'     THEN 'failed'::draft_status
                          ELSE                   'scheduled'::draft_status
                      END,
    updated_at      = CURRENT_TIMESTAMP
FROM scheduled_posts sp
WHERE sp.draft_id = d.id;

-- ---------------------------------------------------------------------------
-- Step 5: RLS ポリシー更新
--         scheduled_posts の RLS を drafts に統合（drafts 側は既存で十分）
--         reply_drafts の RLS も drafts に統合済み（既存ポリシーで対応可）
-- ---------------------------------------------------------------------------

-- scheduled_posts の RLS ポリシーを削除（テーブル削除前にクリア）
DROP POLICY IF EXISTS scheduled_posts_select ON scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_insert ON scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_update ON scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_delete ON scheduled_posts;

-- reply_drafts の RLS ポリシーを削除
DROP POLICY IF EXISTS reply_drafts_select ON reply_drafts;
DROP POLICY IF EXISTS reply_drafts_insert ON reply_drafts;
DROP POLICY IF EXISTS reply_drafts_update ON reply_drafts;
DROP POLICY IF EXISTS reply_drafts_delete ON reply_drafts;

-- ---------------------------------------------------------------------------
-- Step 6: インデックス追加（新カラム対応）
-- ---------------------------------------------------------------------------

-- type 別フィルタ（reply / original / thread の絞り込み）
CREATE INDEX IF NOT EXISTS idx_drafts_type
    ON drafts (type);

-- reply 種別: source_tweet_id での重複チェック・検索
CREATE INDEX IF NOT EXISTS idx_drafts_source_tweet_id
    ON drafts (source_tweet_id)
    WHERE source_tweet_id IS NOT NULL;

-- スケジュール投稿 Cron 用: scheduled かつ scheduled_at <= now()
-- （status インデックスを補完する部分インデックス）
CREATE INDEX IF NOT EXISTS idx_drafts_scheduled_pending
    ON drafts (scheduled_at)
    WHERE status = 'scheduled' AND retry_count < 3;

-- failed ステータスのモニタリング用
CREATE INDEX IF NOT EXISTS idx_drafts_failed
    ON drafts (updated_at DESC)
    WHERE status = 'failed';

-- ai_candidates JSONB の GIN インデックス（高度検索用）
CREATE INDEX IF NOT EXISTS idx_drafts_ai_candidates_gin
    ON drafts USING gin (ai_candidates)
    WHERE ai_candidates IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Step 7: TRIGGER 追加（drafts の updated_at 自動更新は既存で設定済み）
-- ---------------------------------------------------------------------------

-- scheduled_posts / reply_drafts の TRIGGER を削除（テーブル削除前に）
DROP TRIGGER IF EXISTS trg_scheduled_posts_updated_at ON scheduled_posts;
DROP TRIGGER IF EXISTS trg_reply_drafts_updated_at    ON reply_drafts;

-- ---------------------------------------------------------------------------
-- Step 8: scheduled_posts / reply_drafts テーブルを削除
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS scheduled_posts;
DROP TABLE IF EXISTS reply_drafts;

-- ---------------------------------------------------------------------------
-- Step 9: 不要になった ENUM を削除
--         post_status と reply_draft_status は全カラムから参照がなくなる
-- ---------------------------------------------------------------------------

DROP TYPE IF EXISTS post_status;
DROP TYPE IF EXISTS reply_draft_status;

-- ---------------------------------------------------------------------------
-- Step 10: コメント更新
-- ---------------------------------------------------------------------------

COMMENT ON TABLE  drafts IS '投稿下書き統合テーブル。original / reply / thread の種別を type で区別';
COMMENT ON COLUMN drafts.type              IS 'original=通常投稿, reply=リプライ, thread=スレッド';
COMMENT ON COLUMN drafts.source_tweet_id  IS 'リプライ元ツイートID（reply 種別のみ）';
COMMENT ON COLUMN drafts.source_tweet_text IS 'リプライ元ツイート本文スナップショット（reply 種別のみ）';
COMMENT ON COLUMN drafts.ai_candidates    IS 'AI生成候補リスト（reply 種別のみ）。JSONB配列: [{text, generated_by, created_at}]';
COMMENT ON COLUMN drafts.selected_index   IS '選択した ai_candidates 内のインデックス (0-based)。未選択は NULL';
COMMENT ON COLUMN drafts.retry_count      IS 'スケジュール投稿失敗時の再試行回数。上限3回（chk_drafts_retry_count）';
COMMENT ON COLUMN drafts.last_error       IS '直近の投稿失敗エラーメッセージ。成功時は NULL にリセット';
COMMENT ON COLUMN drafts.posted_tweet_id  IS '投稿完了時の X tweet ID（未投稿・失敗時は NULL）';
COMMENT ON COLUMN drafts.status           IS 'pending=未承認, approved=承認済み, scheduled=スケジュール予約済み, processing=投稿処理中, posted=投稿済み, rejected=却下, failed=投稿失敗';
