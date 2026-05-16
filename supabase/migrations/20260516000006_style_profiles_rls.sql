-- =============================================================================
-- Migration: 20260516000006_style_profiles_rls.sql
-- Description: Row Level Security policies for style_profiles table
-- =============================================================================

ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "style_profiles: 自分のアカウントのみ参照"
  ON style_profiles FOR SELECT
  USING (is_own_x_account(x_account_id));

CREATE POLICY "style_profiles: 自分のアカウントにのみ作成"
  ON style_profiles FOR INSERT
  WITH CHECK (is_own_x_account(x_account_id));

CREATE POLICY "style_profiles: 自分のアカウントのみ更新"
  ON style_profiles FOR UPDATE
  USING (is_own_x_account(x_account_id));
