#!/usr/bin/env bash
# deploy.sh — マイグレーション適用 → 本番デプロイ
set -euo pipefail

TARGET="${1:-prod}"

echo "=== preflight ==="

# 未コミット変更チェック
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: 未コミットの変更があります。コミットしてから再実行してください。"
  git status --short
  exit 1
fi

# DBパスワード確認
if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "ERROR: SUPABASE_DB_PASSWORD が未設定です。"
  echo "  export SUPABASE_DB_PASSWORD=your_password"
  exit 1
fi

echo "=== migration ==="

# 未適用マイグレーションの確認と適用
MIGRATION_OUTPUT=$(SUPABASE_DB_PASSWORD="$SUPABASE_DB_PASSWORD" npx supabase db push --linked 2>&1)
echo "$MIGRATION_OUTPUT"

if echo "$MIGRATION_OUTPUT" | grep -q "auth"; then
  echo "ERROR: DBパスワードが正しくありません。Supabase Dashboardで確認してください。"
  exit 1
fi

echo "=== deploy ==="

if [[ "$TARGET" == "prod" || "$TARGET" == "production" ]]; then
  echo "本番デプロイを実行します..."
  vercel --prod
else
  echo "プレビューデプロイを実行します..."
  vercel
fi
