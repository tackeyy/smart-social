-- =============================================================================
-- Migration: 20260517000008_create_style_profiles.sql
-- Description: Create style_profiles table (was missing from initial schema)
-- =============================================================================

CREATE TABLE IF NOT EXISTS style_profiles (
    id           BIGSERIAL    PRIMARY KEY,
    x_account_id BIGINT       NOT NULL REFERENCES x_accounts (id) ON DELETE CASCADE,
    profile_data JSONB        NOT NULL DEFAULT '{}'::JSONB,
    model_version TEXT        NOT NULL DEFAULT 'claude-sonnet-4-6',
    analyzed_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_style_profiles_x_account UNIQUE (x_account_id)
);

CREATE TRIGGER trg_style_profiles_updated_at
    BEFORE UPDATE ON style_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
