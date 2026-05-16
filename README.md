# smart-social

> X（Twitter）運用を自動化する AI 駆動の投稿管理ツール。ドラフト管理・スケジュール投稿を一元化し、Vercel Cron で定時自動投稿を実現します。

URL: `gyomu.ai/smart-social/`

## 主要機能（Phase 1）

| 機能 | 概要 |
|------|------|
| **ドラフト管理** | AI 生成または手動作成した投稿下書きを承認ワークフロー（承認待ち / 承認済み / 却下 / 投稿済み）で管理 |
| **スケジュール投稿** | 承認済みドラフトに投稿日時を設定し、Vercel Cron（毎分実行）が自動投稿 |
| **リトライ制御** | X API 投稿失敗時に最大 3 回リトライ。失敗理由を `last_error` に記録 |
| **認証** | Supabase Auth によるメール / パスワード認証。ダッシュボードは認証必須 |

## 技術スタック

| 区分 | 採用技術 |
|------|----------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS 4 |
| UI コンポーネント | Radix UI + shadcn/ui |
| バックエンド | Supabase (PostgreSQL + Auth + RLS) |
| AI | Anthropic Claude SDK (`@anthropic-ai/sdk`) |
| テスト | Vitest + Testing Library |
| デプロイ | Vercel |
| DNS | Cloudflare |

## ローカル開発セットアップ

### 前提条件

- Node.js 20 以上
- Supabase CLI（`npm install -g supabase`）

### 1. リポジトリのクローンと依存インストール

```bash
git clone <repo-url>
cd smart-social
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、以下を設定します。

```bash
cp .env.local.example .env.local  # example が存在する場合
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# X (Twitter) API v2
X_API_KEY=<api-key>
X_API_SECRET=<api-secret>
X_ACCESS_TOKEN=<access-token>
X_ACCESS_TOKEN_SECRET=<access-token-secret>

# Vercel Cron 認証
CRON_SECRET=<任意の長いランダム文字列>
```

### 3. Supabase ローカル起動とマイグレーション

```bash
supabase start
supabase db reset   # migrations/ 配下のSQLを全て適用
```

### 4. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000/smart-social` にアクセスしてください。

### 5. テスト実行

```bash
npm test           # ワンショット実行
npm run test:watch # ウォッチモード
```

## Supabase セットアップ（本番）

### Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. 「Project Settings > API」から URL・Anon Key・Service Role Key を取得

### マイグレーション適用

```bash
supabase link --project-ref <project-ref>
supabase db push
```

適用されるマイグレーション（`supabase/migrations/` 配下）:

| ファイル | 内容 |
|---------|------|
| `20260516000001_initial_schema.sql` | テーブル定義・ENUM・トリガー（`x_accounts` / `drafts` / `scheduled_posts` / `reply_drafts`） |
| `20260516000002_rls_policies.sql` | Row Level Security ポリシーとヘルパー関数 |
| `20260516000003_indexes.sql` | クエリ最適化インデックス |
| `20260516000004_add_processing_status.sql` | `scheduled_posts.status` に `processing` 追加（二重投稿防止） |
| `20260516000005_add_reply_draft_processing_status.sql` | `reply_drafts` への処理状態カラム追加 |

## デプロイ手順

### Vercel デプロイ

1. [vercel.com](https://vercel.com) でプロジェクトをインポート（GitHub リポジトリを選択）
2. 「Environment Variables」に [環境変数一覧](#環境変数一覧) の全変数を設定
3. 「Deploy」を実行

Vercel Cron（`vercel.json` に定義）が毎分 `/smart-social/api/cron/scheduler` を叩き、スケジュール済み投稿を自動実行します。

### Cloudflare DNS 設定

`gyomu.ai` のサブパスにルーティングする場合は、Cloudflare の DNS / Page Rules で Vercel のデプロイ URL を指すよう設定してください。

1. Cloudflare ダッシュボード > DNS
2. `gyomu.ai` のAレコードまたはCNAMEを Vercel の割り当てドメインへ向ける
3. SSL/TLS モードを「Full (strict)」に設定

## 環境変数一覧

| 変数名 | 必須 | 説明 |
|--------|:----:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクトの URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase の公開 Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase の Service Role Key（サーバーサイドのみ） |
| `X_API_KEY` | ✅ | X Developer App の API Key |
| `X_API_SECRET` | ✅ | X Developer App の API Secret |
| `X_ACCESS_TOKEN` | ✅ | X アカウントの Access Token |
| `X_ACCESS_TOKEN_SECRET` | ✅ | X アカウントの Access Token Secret |
| `CRON_SECRET` | ✅ | Vercel Cron エンドポイントの認証シークレット |

## ディレクトリ構成

```
smart-social/
├── app/
│   ├── api/
│   │   ├── auth/          # 認証コールバック
│   │   ├── cron/
│   │   │   └── scheduler/ # Vercel Cron: スケジュール投稿実行
│   │   ├── drafts/        # ドラフト CRUD API
│   │   └── schedule/      # スケジュール CRUD API
│   ├── auth/
│   │   ├── callback/      # OAuth コールバック
│   │   └── login/         # ログインページ
│   └── dashboard/
│       ├── drafts/        # ドラフト管理画面
│       └── schedule/      # スケジュール管理画面
├── components/
│   ├── drafts/            # ドラフト関連コンポーネント
│   └── ui/                # shadcn/ui ベースの汎用コンポーネント
├── lib/
│   ├── supabase/          # Supabase クライアント（client / server）
│   └── x/                 # X API クライアント
├── supabase/
│   └── migrations/        # DB マイグレーション SQL
├── types/
│   └── app.ts             # アプリ共通型定義
├── middleware.ts           # 認証ガード（未ログイン → /auth/login）
└── vercel.json            # Vercel Cron 設定（毎分実行）
```
