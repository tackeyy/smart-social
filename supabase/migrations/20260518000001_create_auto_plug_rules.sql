-- Auto-plug rules: エンゲージメント閾値トリガーによる自動リプライ設定
CREATE TABLE IF NOT EXISTS auto_plug_rules (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  x_account_id INT NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
  threshold_type  TEXT NOT NULL CHECK (threshold_type IN ('likes', 'retweets', 'replies')),
  threshold_value INT NOT NULL CHECK (threshold_value >= 10),  -- スパム防止のため最低10以上
  template_text   TEXT NOT NULL CHECK (char_length(template_text) BETWEEN 1 AND 280),
  max_executions  INT NOT NULL DEFAULT 1 CHECK (max_executions BETWEEN 1 AND 3),
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 実行済みトラッキング: 同一ツイートへの二重実行防止
CREATE TABLE IF NOT EXISTS auto_plug_executions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id     UUID NOT NULL REFERENCES auto_plug_rules(id) ON DELETE CASCADE,
  source_tweet_id TEXT NOT NULL,
  reply_tweet_id  TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rule_id, source_tweet_id)
);

-- RLS: ユーザーは自分のルールのみ操作可能
ALTER TABLE auto_plug_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_plug_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_auto_plug_rules" ON auto_plug_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_auto_plug_executions" ON auto_plug_executions
  FOR ALL USING (
    rule_id IN (SELECT id FROM auto_plug_rules WHERE user_id = auth.uid())
  );

-- インデックス
CREATE INDEX IF NOT EXISTS idx_auto_plug_rules_user ON auto_plug_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_plug_rules_enabled ON auto_plug_rules(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_auto_plug_executions_rule ON auto_plug_executions(rule_id);
