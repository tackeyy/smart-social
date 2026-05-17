# smart-social

> X（Twitter）運用を AI で自動化する投稿管理 SaaS。文体プロファイル生成・ドラフト管理・スケジュール投稿・オートプラグ・エバーグリーン投稿を一元管理します。

ポジション：**日本の Tweet Hunter**（日本語 × AI 高品質生成 × X 特化）

## なぜ smart-social か

| 比較軸 | Tweet Hunter | SocialDog | **smart-social** |
|--------|:------------:|:---------:|:----------------:|
| 日本語 UI | ✗ | ✓ | ✓ |
| AI 投稿生成品質 | ◎ | △（β レベル） | ◎（Claude） |
| X 特化度 | 極めて高い | 高い | 極めて高い |
| 文体プロファイル学習 | ✗ | ✗ | ✓ |
| Auto-plug | ✓ | ✗ | ✓ |
| Evergreen 再活用 | ✓ | ✗ | ✓ |
| 承認ワークフロー | ✗ | ✗ | ✓ |

**空白地帯**：「日本語 UI × AI 高品質生成 × X 特化」の組み合わせは 2026 年 5 月時点で smart-social のみ。Tweet Hunter は英語専用、SocialDog の AI 生成は補助レベルにとどまります。

## 主要機能

| 機能 | 概要 |
|------|------|
| **文体プロファイル** | ツイート履歴から AI が文体を分析・プロファイル生成。手動編集も可能 |
| **ドラフト管理** | AI 生成または手動作成の下書きを承認ワークフロー（承認待ち / 承認済み / 却下 / 投稿済み）で管理 |
| **AI リプライ生成** | 引用元ツイートに対し文体プロファイルに合わせたリプライ候補を 3 案生成 |
| **スケジュール投稿** | 承認済みドラフトに投稿日時を設定し、Vercel Cron（毎分実行）が自動投稿 |
| **オートプラグ** | 条件を満たしたツイートに自動リプライ（リプライ宣伝）するルール設定 |
| **エバーグリーン投稿** | 繰り返し投稿コンテンツをスケジュール管理 |
| **コンテンツカレンダー** | 投稿計画をカレンダービューで管理 |
| **投稿テンプレート** | よく使う投稿文のテンプレートライブラリ |
| **チーム機能** | 複数メンバーでの共同運用・権限管理 |
| **AI 品質チェック（Precheck）** | 投稿前に断定的表現・コンプライアンス違反を自動検出 |
| **AI 使用量トラッキング** | AI 呼び出しごとのトークン数・コストを記録 |
| **Stripe 課金** | Free / Pro / Business のサブスクリプション管理 |

## 技術スタック

| 区分 | 採用技術 |
|------|----------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript 6 |
| スタイリング | Tailwind CSS 4 |
| UI コンポーネント | Radix UI + shadcn/ui |
| バックエンド | Supabase (PostgreSQL + Auth + RLS) |
| AI | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) |
| 課金 | Stripe |
| テスト | Vitest + Testing Library |
| デプロイ | Vercel |

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

```bash
cp .env.example .env.local
```

`.env.local` に以下を設定します（Stripe は課金機能を使う場合のみ）。

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
X_BEARER_TOKEN=<bearer-token>
X_CALLBACK_URL=http://localhost:3000/api/auth/x/callback

# AI
ANTHROPIC_API_KEY=<anthropic-api-key>

# Vercel Cron 認証
CRON_SECRET=<任意の長いランダム文字列>

# Stripe（課金機能）
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_...
```

### 3. Supabase ローカル起動とマイグレーション

```bash
supabase start
supabase db reset   # migrations/ 配下の SQL を全て適用
```

### 4. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` にアクセスしてください。

### 5. テスト実行

```bash
npm test           # ワンショット実行
npm run test:watch # ウォッチモード
npm run typecheck  # 型チェック
```

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
| `X_BEARER_TOKEN` | ✅ | X API v2 の Bearer Token（タイムライン取得等） |
| `X_CALLBACK_URL` | ✅ | X OAuth コールバック URL |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API Key（Vercel AI SDK 経由で利用） |
| `CRON_SECRET` | ✅ | Vercel Cron エンドポイントの認証シークレット |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 本番サイト URL（`https://gyomu.ai` 等） |
| `STRIPE_SECRET_KEY` | 課金時 | Stripe Secret Key |
| `STRIPE_WEBHOOK_SECRET` | 課金時 | Stripe Webhook 署名シークレット |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 課金時 | Stripe Publishable Key |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | 課金時 | Pro プラン月額の Price ID |
| `STRIPE_PRO_YEARLY_PRICE_ID` | 課金時 | Pro プラン年額の Price ID |
| `STRIPE_BUSINESS_MONTHLY_PRICE_ID` | 課金時 | Business プラン月額の Price ID |
| `STRIPE_BUSINESS_YEARLY_PRICE_ID` | 課金時 | Business プラン年額の Price ID |

## マイグレーション一覧

`supabase/migrations/` 配下：

| ファイル | 内容 |
|---------|------|
| `20260516000001_initial_schema.sql` | 基本テーブル定義（`x_accounts` / `drafts` / `scheduled_posts` / `reply_drafts`） |
| `20260516000002_rls_policies.sql` | Row Level Security ポリシー |
| `20260516000003_indexes.sql` | クエリ最適化インデックス |
| `20260516000004_add_processing_status.sql` | `scheduled_posts` に `processing` ステータス追加（二重投稿防止） |
| `20260516000005_add_reply_draft_processing_status.sql` | `reply_drafts` 処理状態カラム追加 |
| `20260516000006_style_profiles_rls.sql` | `style_profiles` の RLS ポリシー |
| `20260516000007_add_posted_tweet_id.sql` | 投稿済みツイート ID カラム追加 |
| `20260517000008_create_style_profiles.sql` | 文体プロファイルテーブル |
| `20260517000009_add_style_profiles_unique_constraint.sql` | `style_profiles` ユニーク制約 |
| `20260517000010_unify_drafts_schema.sql` | ドラフトスキーマ統合 |
| `20260517015920_create_content_calendar_events.sql` | コンテンツカレンダーテーブル |
| `20260517020327_create_post_templates.sql` | 投稿テンプレートテーブル |
| `20260518000001_create_auto_plug_rules.sql` | オートプラグルールテーブル |
| `20260518000002_create_evergreen_rules.sql` | エバーグリーンルールテーブル |
| `20260518000003_create_teams.sql` | チームテーブル |
| `20260519000001_create_ai_usage_logs.sql` | AI 使用量ログテーブル |
| `20260519000002_create_subscriptions.sql` | Stripe サブスクリプションテーブル |

## ディレクトリ構成

```
smart-social/
├── app/
│   ├── api/
│   │   ├── accounts/        # X アカウント登録・管理
│   │   ├── analytics/       # 投稿分析データ
│   │   ├── auth/            # 認証コールバック
│   │   ├── auto-plug/       # オートプラグルール CRUD
│   │   ├── content-calendar/ # コンテンツカレンダー CRUD
│   │   ├── cron/
│   │   │   └── scheduler/   # Vercel Cron: スケジュール投稿実行（毎分）
│   │   ├── drafts/          # ドラフト CRUD・AI 生成
│   │   ├── evergreen/       # エバーグリーン投稿 CRUD
│   │   ├── media/           # メディアアップロード
│   │   ├── profile/         # 文体プロファイル生成・手動編集
│   │   ├── schedule/        # スケジュール CRUD
│   │   ├── stripe/          # Stripe Checkout / Portal / Webhook
│   │   ├── teams/           # チーム管理
│   │   ├── templates/       # 投稿テンプレート CRUD
│   │   ├── usage/           # AI 使用量集計
│   │   └── x/               # X API プロキシ（timeline / lookup 等）
│   ├── auth/
│   │   ├── callback/        # OAuth コールバック
│   │   └── login/           # ログインページ
│   └── dashboard/
│       ├── accounts/        # X アカウント管理画面
│       ├── analytics/       # 分析ダッシュボード
│       ├── drafts/          # ドラフト管理画面
│       ├── evergreen/       # エバーグリーン管理画面
│       ├── mentions/        # メンション一覧
│       ├── schedule/        # スケジュール管理画面
│       ├── settings/        # 設定（文体プロファイル編集含む）
│       ├── timeline/        # タイムライン
│       └── usage/           # AI 使用量ダッシュボード
├── components/
│   ├── dashboard/           # ダッシュボード共通コンポーネント
│   ├── drafts/              # ドラフト関連コンポーネント
│   ├── evergreen/           # エバーグリーン関連コンポーネント
│   ├── profile/             # 文体プロファイル関連コンポーネント
│   └── ui/                  # shadcn/ui ベースの汎用コンポーネント
├── lib/
│   ├── ai/
│   │   ├── models.ts        # AI モデル定数（プロバイダー切り替えはここだけ）
│   │   └── client.ts        # generateStyleProfile / generateDraftCandidates
│   ├── precheck/
│   │   └── engine.ts        # 投稿品質チェック（Precheck）
│   ├── stripe.ts            # Stripe クライアント
│   ├── subscription.ts      # サブスクリプション取得ヘルパー
│   ├── supabase/            # Supabase クライアント（client / server）
│   ├── usage/               # AI 使用量ロギング・コスト計算
│   └── x/                   # X API クライアント
├── supabase/
│   └── migrations/          # DB マイグレーション SQL
├── __tests__/               # Vitest テストスイート
├── middleware.ts             # 認証ガード（未ログイン → /auth/login）
└── vercel.json              # Vercel Cron 設定
```

## AI プロバイダー設計

AI モデルの設定は `lib/ai/models.ts` の **1 ファイル**に集約されています。

```typescript
// lib/ai/models.ts
import { anthropic } from '@ai-sdk/anthropic'

export const STYLE_PROFILE_MODEL = anthropic('claude-sonnet-4-6')
export const DRAFT_MODEL = anthropic('claude-sonnet-4-6')
export const PRECHECK_MODEL = anthropic('claude-haiku-4-5-20251001')
```

OpenAI / Gemini 等への切り替えはこのファイルのみ変更すれば完結します（Vercel AI SDK による統一インターフェース）。

## プライシング

| プラン | 月額 | 年額 |
|--------|------|------|
| Free | ¥0 | — |
| Pro | ¥4,980 | ¥47,800 |
| Business | ¥12,800 | ¥122,900 |

## デプロイ

```bash
vercel --prod
```

Vercel Cron（`vercel.json`）が毎分 `/api/cron/scheduler` を実行し、スケジュール済み投稿を自動投稿します。
