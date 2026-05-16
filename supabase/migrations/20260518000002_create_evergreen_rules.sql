-- Evergreen rules: 定期再投稿ルール設定
CREATE TABLE IF NOT EXISTS evergreen_rules (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  x_account_id     INT NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
  source_tweet_id  TEXT NOT NULL,
  source_content   TEXT NOT NULL CHECK (char_length(source_content) BETWEEN 1 AND 280),
  registered_score INT NOT NULL DEFAULT 0,
  prefix_pool      JSONB NOT NULL DEFAULT '[]'::JSONB,
  interval_days    INT NOT NULL DEFAULT 30 CHECK (interval_days BETWEEN 7 AND 365),
  max_runs         INT CHECK (max_runs > 0),  -- NULL = 無制限
  run_count        INT NOT NULL DEFAULT 0 CHECK (run_count >= 0),
  last_run_at      TIMESTAMPTZ,
  next_run_at      TIMESTAMPTZ,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, x_account_id, source_tweet_id)
);

-- RLS: ユーザーは自分のルールのみ操作可能
ALTER TABLE evergreen_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_evergreen_rules" ON evergreen_rules
  FOR ALL USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_evergreen_rules_user ON evergreen_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_evergreen_rules_next_run ON evergreen_rules(next_run_at) WHERE enabled = true;
