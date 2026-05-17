CREATE TABLE post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id BIGINT REFERENCES x_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('post', 'reply', 'dm')),
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_templates_owner" ON post_templates
  USING (
    account_id IN (
      SELECT id FROM x_accounts WHERE user_id = auth.uid()
    )
  );

CREATE INDEX post_templates_account_id_idx ON post_templates (account_id);
