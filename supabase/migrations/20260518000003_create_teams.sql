-- teams テーブル
CREATE TABLE IF NOT EXISTS teams (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- team_members テーブル
CREATE TABLE IF NOT EXISTS team_members (
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- team_x_accounts テーブル（チームとXアカウントのM:N）
CREATE TABLE IF NOT EXISTS team_x_accounts (
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  x_account_id BIGINT NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
  added_by     UUID REFERENCES auth.users(id),
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, x_account_id)
);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_x_accounts ENABLE ROW LEVEL SECURITY;

-- teams: メンバーのみ参照可能
CREATE POLICY "team_members_can_view_teams" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- teams: 認証済みユーザーは作成可能
CREATE POLICY "authenticated_can_create_teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- teams: ownerのみ更新・削除
CREATE POLICY "owner_can_update_team" ON teams
  FOR UPDATE USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "owner_can_delete_team" ON teams
  FOR DELETE USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- team_members: メンバーは参照可能
CREATE POLICY "members_can_view_team_members" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );
