#!/usr/bin/env bash
# deploy.sh — マイグレーション適用 → 本番デプロイ（手元実行用）
# 必要な環境変数: SUPABASE_ACCESS_TOKEN
set -euo pipefail

TARGET="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== preflight ==="

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: 未コミットの変更があります。コミットしてから再実行してください。"
  git status --short
  exit 1
fi

echo "=== migration ==="
bash "$SCRIPT_DIR/migrate.sh"

echo "=== deploy ==="
if [[ "$TARGET" == "prod" || "$TARGET" == "production" ]]; then
  echo "本番デプロイを実行します..."
  vercel --prod
else
  echo "プレビューデプロイを実行します..."
  vercel
fi
