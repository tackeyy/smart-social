-- =============================================================================
-- Migration: 20260516000002_rls_policies.sql
-- Description: Row Level Security policies and helper functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ヘルパー関数: is_own_x_account(x_account_id BIGINT)
-- 引数の x_account_id が auth.uid() に属するかを返す
-- SECURITY DEFINER + search_path 固定でプリビレッジエスカレーション防止
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_own_x_account(p_x_account_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM   x_accounts
        WHERE  id      = p_x_account_id
          AND  user_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION is_own_x_account(BIGINT) IS '
引数の x_account_id が現在の認証ユーザー (auth.uid()) に属する場合 TRUE を返す。
RLS ポリシーから呼び出すヘルパー関数。SECURITY DEFINER で権限固定。
';

-- ---------------------------------------------------------------------------
-- RLS 有効化
-- ---------------------------------------------------------------------------

ALTER TABLE x_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_drafts   ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- x_accounts ポリシー
-- ---------------------------------------------------------------------------

-- SELECT: 自分のアカウントのみ
CREATE POLICY x_accounts_select
    ON x_accounts
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: user_id を自分の UID に固定
CREATE POLICY x_accounts_insert
    ON x_accounts
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- UPDATE: 自分のアカウントのみ
CREATE POLICY x_accounts_update
    ON x_accounts
    FOR UPDATE
    USING  (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: 自分のアカウントのみ
CREATE POLICY x_accounts_delete
    ON x_accounts
    FOR DELETE
    USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- drafts ポリシー
-- ---------------------------------------------------------------------------

-- SELECT: 自分の draft のみ
CREATE POLICY drafts_select
    ON drafts
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: user_id を自分の UID に固定 + x_account_id が自分のもの
CREATE POLICY drafts_insert
    ON drafts
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND is_own_x_account(x_account_id)
    );

-- UPDATE: 自分の draft のみ
CREATE POLICY drafts_update
    ON drafts
    FOR UPDATE
    USING  (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND is_own_x_account(x_account_id)
    );

-- DELETE: 自分の draft のみ
CREATE POLICY drafts_delete
    ON drafts
    FOR DELETE
    USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- scheduled_posts ポリシー
-- draft.user_id 経由でオーナー確認（JOIN）
-- ---------------------------------------------------------------------------

-- SELECT: 自分の draft に紐づく scheduled_posts のみ
CREATE POLICY scheduled_posts_select
    ON scheduled_posts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM drafts d
            WHERE  d.id      = scheduled_posts.draft_id
              AND  d.user_id = auth.uid()
        )
    );

-- INSERT: draft が自分のもの
CREATE POLICY scheduled_posts_insert
    ON scheduled_posts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM drafts d
            WHERE  d.id      = draft_id
              AND  d.user_id = auth.uid()
        )
    );

-- UPDATE: draft が自分のもの
CREATE POLICY scheduled_posts_update
    ON scheduled_posts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM drafts d
            WHERE  d.id      = scheduled_posts.draft_id
              AND  d.user_id = auth.uid()
        )
    );

-- DELETE: draft が自分のもの
CREATE POLICY scheduled_posts_delete
    ON scheduled_posts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM drafts d
            WHERE  d.id      = scheduled_posts.draft_id
              AND  d.user_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- reply_drafts ポリシー
-- ---------------------------------------------------------------------------

-- SELECT: 自分の reply_drafts のみ
CREATE POLICY reply_drafts_select
    ON reply_drafts
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: user_id を自分の UID に固定 + x_account_id が自分のもの
CREATE POLICY reply_drafts_insert
    ON reply_drafts
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND is_own_x_account(x_account_id)
    );

-- UPDATE: 自分の reply_drafts のみ
CREATE POLICY reply_drafts_update
    ON reply_drafts
    FOR UPDATE
    USING  (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND is_own_x_account(x_account_id)
    );

-- DELETE: 自分の reply_drafts のみ
CREATE POLICY reply_drafts_delete
    ON reply_drafts
    FOR DELETE
    USING (user_id = auth.uid());
