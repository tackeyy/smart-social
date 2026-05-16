# Phase 3-A: チーム管理・ロール管理 設計ドキュメント

## 概要

### 背景と目的

issue #27「チーム管理・権限管理・承認ワークフロー」への対応。
現状の smart-social は単一ユーザー前提（`user_id = auth.uid()`）で設計されており、
複数人のチームで X アカウントを運用するユースケースに対応できていない。

Phase 3-A では「チーム作成・招待・ロール管理」を実装し、
Phase 3-B（承認ワークフロー）の土台を整える。

### スコープ（Phase 3-A）

- `teams` / `team_members` テーブル設計とマイグレーション
- RLS 戦略（既存単一ユーザーへの影響ゼロを保証）
- API ルート設計（CRUD）
- チーム設定 UI のファイル構成
- 実装の優先順位

---

## 現状分析

### 既存スキーマ

```
x_accounts   → user_id UUID (auth.users)       1ユーザー:N アカウント
drafts       → user_id UUID, x_account_id      1ユーザーが下書きを所有
```

### 既存 RLS（全テーブル共通パターン）

```sql
USING (user_id = auth.uid())
```

シンプルな単一ユーザー前提。チーム概念を追加する場合、
「既存ユーザーは今まで通り user_id で参照できる」を保ちつつ、
「チームに属する場合はチームメンバーも参照できる」に拡張する必要がある。

### draft_status ENUM の現状

```sql
'pending' | 'approved' | 'rejected' | 'posted' | 'processing' | 'scheduled' | 'failed'
```

`approved` が ENUM に存在するが、#15 で UI/コードレベルでは廃止済み。
Phase 3-B（承認ワークフロー）で正式復活させる想定のため、ENUM は触らない。

---

## 提案するアーキテクチャ

### 設計方針

**シンプルさ優先 / YAGNI 徹底**

- チーム機能は新テーブル追加のみ。既存テーブルへのカラム追加は最小限
- `x_accounts.team_id` を追加する「X アカウントをチームに紐付ける」案も検討したが、
  「1 ユーザーが複数チームに属し、チームごとに異なる X アカウントを持つ」構造は
  現フェーズでは不要。team_members テーブル経由で参照する方がシンプル

### ロール設計

```
owner   : チーム作成者。メンバー管理・チーム削除権限
admin   : メンバー招待・削除権限（オーナー以外）
member  : 下書き作成・参照のみ（Phase 3-B では承認権限なし）
```

Phase 3-A では 3 ロールを定義するが、UI では owner/member の 2 択で十分。
admin は Phase 3-B 以降に活用する。

---

## DBスキーマ（SQL）

### マイグレーション: `20260519000001_create_teams.sql`

```sql
-- =============================================================================
-- Migration: 20260519000001_create_teams.sql
-- Description: Phase 3-A チーム管理テーブル
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM: team_member_role
-- ---------------------------------------------------------------------------
CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member');

-- ---------------------------------------------------------------------------
-- Table: teams
-- チーム情報
-- ---------------------------------------------------------------------------
CREATE TABLE teams (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    created_by  UUID        NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  teams IS 'チーム情報。複数ユーザーで X アカウントを共同管理するための単位';
COMMENT ON COLUMN teams.created_by IS 'チーム作成者の user_id。退会時は RESTRICT で保護（チーム移譲後に削除）';

-- ---------------------------------------------------------------------------
-- Table: team_members
-- チームメンバーシップ（ユーザー × チーム × ロール）
-- ---------------------------------------------------------------------------
CREATE TABLE team_members (
    id          BIGSERIAL           PRIMARY KEY,
    team_id     UUID                NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    user_id     UUID                NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role        team_member_role    NOT NULL DEFAULT 'member',
    invited_by  UUID                REFERENCES auth.users (id) ON DELETE SET NULL,
    joined_at   TIMESTAMPTZ         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_team_members_team_user UNIQUE (team_id, user_id)
);

COMMENT ON TABLE  team_members IS 'チームメンバーシップ。1 ユーザーは複数チームに所属可能';
COMMENT ON COLUMN team_members.role      IS 'owner=作成者, admin=管理者, member=一般メンバー';
COMMENT ON COLUMN team_members.invited_by IS '招待者の user_id（直接登録の場合は NULL）';

-- ---------------------------------------------------------------------------
-- Table: team_x_accounts
-- チームと X アカウントの紐付け（M:N）
-- ---------------------------------------------------------------------------
CREATE TABLE team_x_accounts (
    id              BIGSERIAL   PRIMARY KEY,
    team_id         UUID        NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    x_account_id    BIGINT      NOT NULL REFERENCES x_accounts (id) ON DELETE CASCADE,
    added_by        UUID        NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_team_x_accounts UNIQUE (team_id, x_account_id)
);

COMMENT ON TABLE  team_x_accounts IS 'チームに共有された X アカウント。既存 x_accounts への参照のみ（所有者は変わらない）';
COMMENT ON COLUMN team_x_accounts.added_by IS 'X アカウントをチームに追加したユーザー（owner/admin 限定）';

-- ---------------------------------------------------------------------------
-- インデックス
-- ---------------------------------------------------------------------------

-- チーム一覧（作成者から引く）
CREATE INDEX idx_teams_created_by
    ON teams (created_by);

-- ユーザーが所属するチーム一覧
CREATE INDEX idx_team_members_user_id
    ON team_members (user_id);

-- チームのメンバー一覧
CREATE INDEX idx_team_members_team_id
    ON team_members (team_id);

-- チームに紐付いた X アカウント一覧
CREATE INDEX idx_team_x_accounts_team_id
    ON team_x_accounts (team_id);

-- X アカウントが属するチーム一覧（逆引き）
CREATE INDEX idx_team_x_accounts_x_account_id
    ON team_x_accounts (x_account_id);

-- ---------------------------------------------------------------------------
-- updated_at TRIGGER
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS 有効化（ポリシーは次マイグレーションで定義）
-- ---------------------------------------------------------------------------

ALTER TABLE teams           ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_x_accounts ENABLE ROW LEVEL SECURITY;
```

### マイグレーション: `20260519000002_teams_rls.sql`

```sql
-- =============================================================================
-- Migration: 20260519000002_teams_rls.sql
-- Description: Phase 3-A チーム管理 RLS ポリシー
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ヘルパー関数: is_team_member(p_team_id UUID)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM   team_members
        WHERE  team_id = p_team_id
          AND  user_id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- ヘルパー関数: is_team_owner_or_admin(p_team_id UUID)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_team_owner_or_admin(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM   team_members
        WHERE  team_id = p_team_id
          AND  user_id = auth.uid()
          AND  role    IN ('owner', 'admin')
    );
$$;

-- ---------------------------------------------------------------------------
-- teams ポリシー
-- ---------------------------------------------------------------------------

-- SELECT: 自分が所属するチームのみ
CREATE POLICY teams_select
    ON teams FOR SELECT
    USING (is_team_member(id));

-- INSERT: 誰でも作成可能（作成者が自動的に owner になる）
CREATE POLICY teams_insert
    ON teams FOR INSERT
    WITH CHECK (created_by = auth.uid());

-- UPDATE: owner/admin のみ
CREATE POLICY teams_update
    ON teams FOR UPDATE
    USING  (is_team_owner_or_admin(id))
    WITH CHECK (is_team_owner_or_admin(id));

-- DELETE: owner のみ（アプリ側でも二重チェック）
CREATE POLICY teams_delete
    ON teams FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE  team_id = teams.id
              AND  user_id = auth.uid()
              AND  role    = 'owner'
        )
    );

-- ---------------------------------------------------------------------------
-- team_members ポリシー
-- ---------------------------------------------------------------------------

-- SELECT: 同一チームのメンバーは互いに参照可能
CREATE POLICY team_members_select
    ON team_members FOR SELECT
    USING (is_team_member(team_id));

-- INSERT: owner/admin のみ招待可能（自分を招待はアプリ側で弾く）
CREATE POLICY team_members_insert
    ON team_members FOR INSERT
    WITH CHECK (is_team_owner_or_admin(team_id));

-- UPDATE: owner/admin のみロール変更可能
CREATE POLICY team_members_update
    ON team_members FOR UPDATE
    USING  (is_team_owner_or_admin(team_id))
    WITH CHECK (is_team_owner_or_admin(team_id));

-- DELETE: owner/admin のみ除名可能（自分自身の退会は member も可）
CREATE POLICY team_members_delete
    ON team_members FOR DELETE
    USING (
        is_team_owner_or_admin(team_id)
        OR user_id = auth.uid()   -- 自分自身の退会
    );

-- ---------------------------------------------------------------------------
-- team_x_accounts ポリシー
-- ---------------------------------------------------------------------------

-- SELECT: チームメンバーは参照可能
CREATE POLICY team_x_accounts_select
    ON team_x_accounts FOR SELECT
    USING (is_team_member(team_id));

-- INSERT: owner/admin のみ X アカウントをチームに追加可能
--         追加できるのは自分が所有する X アカウントのみ
CREATE POLICY team_x_accounts_insert
    ON team_x_accounts FOR INSERT
    WITH CHECK (
        is_team_owner_or_admin(team_id)
        AND is_own_x_account(x_account_id)
    );

-- DELETE: owner/admin のみ
CREATE POLICY team_x_accounts_delete
    ON team_x_accounts FOR DELETE
    USING (is_team_owner_or_admin(team_id));
```

---

## RLS 戦略

### 既存ユーザーへの影響ゼロ保証

**既存のポリシーは一切変更しない。**
新テーブル（teams, team_members, team_x_accounts）の追加のみ。

```
既存ユーザー（チーム未参加）
  → x_accounts, drafts の RLS: user_id = auth.uid() のまま動作
  → teams, team_members を参照する機会がないため影響ゼロ

チーム参加ユーザー
  → x_accounts, drafts の既存 RLS: 自分の x_account は従来通り参照可能
  → team_x_accounts 経由でチームの X アカウントも参照できるよう、
    Phase 3-B 以降に drafts の RLS を拡張する（Phase 3-A では不要）
```

### Phase 3-A での drafts RLS 拡張（最小限）

Phase 3-A では drafts テーブルの RLS は変更しない。
チームメンバーが他メンバーの drafts を参照するのは Phase 3-B（承認ワークフロー）で対応。

---

## API ルート設計

### チーム CRUD

| Method | Path | 説明 | 認可 |
|--------|------|------|------|
| GET    | `/api/teams` | 自分が所属するチーム一覧 | ログイン必須 |
| POST   | `/api/teams` | チーム作成（作成者が owner に自動登録） | ログイン必須 |
| GET    | `/api/teams/[id]` | チーム詳細（メンバー一覧含む） | メンバーのみ |
| PATCH  | `/api/teams/[id]` | チーム名変更 | owner/admin |
| DELETE | `/api/teams/[id]` | チーム削除 | owner |

### メンバー管理

| Method | Path | 説明 | 認可 |
|--------|------|------|------|
| GET    | `/api/teams/[id]/members` | メンバー一覧 | メンバーのみ |
| POST   | `/api/teams/[id]/members` | メンバー招待（email指定） | owner/admin |
| PATCH  | `/api/teams/[id]/members/[userId]` | ロール変更 | owner/admin |
| DELETE | `/api/teams/[id]/members/[userId]` | メンバー除名 or 自己退会 | owner/admin or 本人 |

### X アカウント共有

| Method | Path | 説明 | 認可 |
|--------|------|------|------|
| GET    | `/api/teams/[id]/accounts` | チームの X アカウント一覧 | メンバーのみ |
| POST   | `/api/teams/[id]/accounts` | X アカウントをチームに追加 | owner/admin（自所有のみ） |
| DELETE | `/api/teams/[id]/accounts/[xAccountId]` | X アカウントをチームから外す | owner/admin |

### API 設計上の注意

**招待フロー（Phase 3-A 簡易版）**

招待は「メールアドレスで検索 → 即時追加」の最小実装。
招待メール送信・トークン管理は Phase 3-B 以降に検討。

```
POST /api/teams/[id]/members
Body: { email: "xxx@example.com", role: "member" }

→ auth.users から email で user_id を検索（要: service_role key）
→ 見つかれば team_members に INSERT
→ 見つからなければ 404 "このメールアドレスはまだ登録されていません"
```

**service_role の使用について**
`auth.users` から email 検索には service_role key が必要。
Next.js の Route Handler（サーバーサイド）のみで使用し、クライアントには露出しない。

---

## ファイル構成

```
app/
├── api/
│   └── teams/
│       ├── route.ts                          # GET (一覧) / POST (作成)
│       └── [id]/
│           ├── route.ts                      # GET (詳細) / PATCH (更新) / DELETE
│           ├── members/
│           │   ├── route.ts                  # GET (一覧) / POST (招待)
│           │   └── [userId]/
│           │       └── route.ts              # PATCH (ロール変更) / DELETE (除名/退会)
│           └── accounts/
│               ├── route.ts                  # GET (一覧) / POST (追加)
│               └── [xAccountId]/
│                   └── route.ts              # DELETE (削除)
│
├── dashboard/
│   └── settings/
│       └── team/                             # チーム設定ページ（新規追加）
│           ├── page.tsx                      # Server Component: チーム一覧 / 作成
│           ├── [id]/
│           │   ├── page.tsx                  # チーム詳細・メンバー管理
│           │   └── _components/
│           │       ├── MemberList.tsx        # メンバー一覧テーブル
│           │       ├── InviteMemberDialog.tsx # 招待ダイアログ
│           │       ├── RoleSelector.tsx      # ロール変更 UI
│           │       └── TeamAccountList.tsx   # X アカウント共有一覧
│           └── _components/
│               ├── TeamCard.tsx              # チーム一覧カード
│               └── CreateTeamDialog.tsx      # チーム作成ダイアログ
│
types/
└── team.ts                                   # Team / TeamMember / TeamRole 型定義

lib/
└── teams/
    ├── queries.ts                            # Supabase クエリ関数
    └── permissions.ts                        # ロール判定ユーティリティ
```

---

## 型定義（`types/team.ts`）

```typescript
export type TeamMemberRole = 'owner' | 'admin' | 'member'

export interface Team {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: number
  team_id: string
  user_id: string
  role: TeamMemberRole
  invited_by: string | null
  joined_at: string
  // JOIN で付加（API レスポンス用）
  email?: string
}

export interface TeamXAccount {
  id: number
  team_id: string
  x_account_id: number
  added_by: string
  added_at: string
  // JOIN で付加
  screen_name?: string
}
```

---

## 実装の優先順位

### Step 1: DBマイグレーション（所要: 1h）

1. `20260519000001_create_teams.sql` 実行
2. `20260519000002_teams_rls.sql` 実行
3. `types/team.ts` 作成

### Step 2: API 実装（所要: 3-4h）

優先順位順:
1. `POST /api/teams` チーム作成（owner 自動登録含む）
2. `GET /api/teams` チーム一覧
3. `GET /api/teams/[id]` チーム詳細
4. `POST /api/teams/[id]/members` メンバー招待
5. `DELETE /api/teams/[id]/members/[userId]` 退会・除名
6. `POST /api/teams/[id]/accounts` X アカウント共有
7. 残りの PATCH/DELETE エンドポイント

### Step 3: UI 実装（所要: 3-4h）

1. `settings/team/page.tsx` チーム一覧 + 作成ダイアログ
2. `settings/team/[id]/page.tsx` チーム詳細 + メンバー一覧
3. `InviteMemberDialog.tsx` + `MemberList.tsx`
4. ダッシュボード設定ナビゲーションに「チーム」リンク追加

---

## 実装上の注意点

### 1. owner が唯一の場合のチーム削除

owner が 1 人しかいない状態でのチーム削除は、
`team_members.CASCADE` で自動削除されるが、
`teams.created_by` が `ON DELETE RESTRICT` なのでオーナーのアカウント削除はブロックされる。
アプリ側でチーム削除 → アカウント削除の順序を強制する。

### 2. owner の除名禁止

`DELETE /api/teams/[id]/members/[userId]` で owner を除名しようとした場合は 403 を返す。
owner 移譲（役割変更）を先に行う UI フローにする。

### 3. チーム X アカウント共有と drafts の所有権

Phase 3-A では `drafts.user_id` は変更しない。
チームメンバーが draft を作成した場合も `drafts.user_id = 作成者の user_id` で記録する。
Phase 3-B で `drafts.team_id` カラムを追加して承認ワークフローに対応する。

### 4. service_role key の管理

招待フローで `auth.users` を email 検索する際に使用する。
`SUPABASE_SERVICE_ROLE_KEY` は既に `.env` に設定済みのはず。
**Route Handler のサーバーサイドのみで使用し、`NEXT_PUBLIC_` プレフィックスは絶対に付けない。**

### 5. RLS ヘルパー関数のキャッシュ

`is_team_member` / `is_team_owner_or_admin` は `STABLE` + `SECURITY DEFINER`。
1 クエリ内では複数回呼ばれても Postgres がキャッシュするため、
リスト取得クエリでのパフォーマンス劣化は最小限。

---

## Phase 3-B 接続ポイント（先読み）

Phase 3-A 完了後、Phase 3-B（承認ワークフロー）で追加する変更:

1. `drafts` テーブルに `team_id UUID` カラムを追加（NULL = 個人ドラフト）
2. `drafts` の RLS を拡張:
   - `team_id IS NULL → user_id = auth.uid()`（既存）
   - `team_id IS NOT NULL → is_team_member(team_id)`（新規）
3. `approved` ステータスを UI/コードレベルで正式復活
4. 承認アクション: `PATCH /api/drafts/[id]` で `status: 'approved'` への遷移を追加

---

## 修正履歴

| 日時 | 内容 |
|------|------|
| 2026-05-17 | 初版作成（Phase 3-A: チーム作成・招待・ロール管理） |
