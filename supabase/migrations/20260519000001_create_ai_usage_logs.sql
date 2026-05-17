-- =============================================================================
-- Migration: 20260519000001_create_ai_usage_logs.sql
-- Description: AI API呼び出しのトークン使用量・コスト記録テーブル
--              将来の外販（マルチユーザー）を見据えた設計
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM Types
-- ---------------------------------------------------------------------------

CREATE TYPE ai_endpoint AS ENUM (
    'drafts_generate',
    'profile_generate',
    'precheck'
);

CREATE TYPE ai_model AS ENUM (
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001'
);

-- ---------------------------------------------------------------------------
-- Table: ai_usage_logs
-- AI API呼び出しごとのトークン使用量・コスト記録
--
-- コスト単価（参考）:
--   claude-sonnet-4-6          : input $3/MTok,    output $15/MTok
--   claude-haiku-4-5-20251001  : input $0.80/MTok, output $4/MTok
-- ---------------------------------------------------------------------------

CREATE TABLE ai_usage_logs (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       UUID         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    endpoint      ai_endpoint  NOT NULL,
    model         ai_model     NOT NULL,
    input_tokens  INTEGER      NOT NULL CHECK (input_tokens  >= 0),
    output_tokens INTEGER      NOT NULL CHECK (output_tokens >= 0),
    -- 呼び出し時点の単価で計算してINSERT時に確定する（小数点10桁: 超小規模呼び出しでも精度損失なし）
    cost_usd      NUMERIC(12, 10) NOT NULL CHECK (cost_usd >= 0),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  ai_usage_logs IS 'AI API（Claude等）の呼び出しごとのトークン使用量・コストを記録する監査ログ。将来の外販・課金管理の基盤';
COMMENT ON COLUMN ai_usage_logs.endpoint     IS '呼び出し元機能: drafts_generate=投稿生成, profile_generate=プロファイル生成, precheck=事前チェック';
COMMENT ON COLUMN ai_usage_logs.model        IS '使用したAIモデル識別子';
COMMENT ON COLUMN ai_usage_logs.input_tokens IS 'プロンプト（入力）トークン数';
COMMENT ON COLUMN ai_usage_logs.output_tokens IS '生成（出力）トークン数';
COMMENT ON COLUMN ai_usage_logs.cost_usd     IS 'INPUT/OUTPUTトークンから計算した費用（USD）。INSERT時にアプリケーション側で計算して保存';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分のログのみ参照可能
CREATE POLICY ai_usage_logs_select
    ON ai_usage_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: user_id を自分の UID に固定
CREATE POLICY ai_usage_logs_insert
    ON ai_usage_logs
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- UPDATE / DELETE は禁止（監査ログのため改ざん不可）
-- ポリシー未定義 = 該当 DML は RLS によりすべて拒否

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- 月次集計クエリ最適化: WHERE user_id = ? AND created_at >= ?
-- 複合インデックス（user_id 先頭）で等値 + 範囲を一本でカバー
CREATE INDEX idx_ai_usage_logs_user_id_created_at
    ON ai_usage_logs (user_id, created_at DESC);

-- endpoint 別集計（機能別コスト分析）
CREATE INDEX idx_ai_usage_logs_endpoint_created_at
    ON ai_usage_logs (endpoint, created_at DESC);

-- model 別集計（モデル別コスト比較）
CREATE INDEX idx_ai_usage_logs_model_created_at
    ON ai_usage_logs (model, created_at DESC);
