<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your
training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## デプロイ手順

### 通常デプロイ（推奨）: git push

`main` ブランチへの push が Vercel GitHub Integration で本番自動デプロイされる。

```bash
git push origin main
```

- マイグレーションが**ない**変更はこれだけでよい
- Vercel ダッシュボードでビルド状況を確認: https://vercel.com/yusuke-takitas-projects/smart-social

### バックアップ / マイグレーション付きデプロイ: `scripts/deploy.sh`

DBマイグレーションを伴う変更、またはGitHub Integration が使えない場合に使う。

```bash
# 事前: Supabaseアクセストークンをシェル環境変数にセット（~/.zshrc に export 推奨）
export SUPABASE_ACCESS_TOKEN=sbp_xxxx  # supabase.com/dashboard/account/tokens

# 本番デプロイ（マイグレーション → vercel --prod）
bash scripts/deploy.sh prod
```

- `SUPABASE_ACCESS_TOKEN` が未設定の場合はデプロイを中止する
- 未コミット変更がある場合もデプロイを中止する
- マイグレーションは Management API 経由で適用（DBパスワード不要）
- 適用済みのマイグレーションは自動スキップ

### GitHub Integration の設定（初回のみ・ブラウザ必要）

未設定の場合は以下で接続する:
1. https://vercel.com/yusuke-takitas-projects/smart-social/settings/git を開く
2. "Connect Git Repository" → `tackeyy/smart-social` を選択

## 公開URLとルーティング確認

- アプリ本体の本番デプロイ先は Vercel project `smart-sns`
- 公開URL `https://gyomu.ai/smart-social` は Cloudflare Worker route `gyomu.ai/smart-social*` で Vercel の `https://smart-sns.vercel.app/smart-social` にプロキシする
- Worker設定はこのリポジトリの `cloudflare/` 配下で管理する
  - `cloudflare/smart-social-proxy.js`
  - `cloudflare/wrangler-proxy.toml`
- `gyomu.ai/smart-social` が404の場合は、別リポジトリを触る前に以下を確認する
  1. Vercel production deployment が Ready か: `vercel ls smart-sns --scope team_SIcCzRiiLuONtecnrwb2FpXf`
  2. Vercel直URLが200か: `curl -L https://smart-sns.vercel.app/smart-social`
  3. Cloudflare Worker route が反映済みか: `wrangler deployments list --name gyomu-smart-social-proxy`
  4. 公開URLが200か: `curl -L https://gyomu.ai/smart-social`
- ルーティング修正は原則として `smart-social` リポジトリ内の `cloudflare/` を使う。`smart-outreach` など別リポジトリへ作業範囲を広げる前に、必ず対象が本当にそのリポジトリで管理されているか確認する

## Git コミットルール

- issue を解決するコミットには必ず **`closes #N`** または **`fixes #N`** をコミットメッセージ本文に含める
  - `feat(#32): 投稿テンプレートライブラリを追加` のようなタイトルだけでは issue は自動クローズされない
  - 本文（body）に `Closes #32` を記載することで GitHub が自動クローズする
- 複数 issue を解決する場合はカンマ区切りで列挙する: `Closes #33, Closes #40`
- フォーマット例:
  ```
  fix(#33,#40): timeline 422→502, validate pagination_token format

  Closes #33
  Closes #40
  ```
