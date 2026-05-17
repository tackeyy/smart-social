#!/usr/bin/env bash
# deploy.sh — マイグレーション適用 → 本番デプロイ
# 必要な環境変数: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF
set -euo pipefail

TARGET="${1:-prod}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-rwbfafdivhzfzzwrkviy}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
API_BASE="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"

echo "=== preflight ==="

# 未コミット変更チェック
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: 未コミットの変更があります。コミットしてから再実行してください。"
  git status --short
  exit 1
fi

# アクセストークン確認
if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN が未設定です。"
  echo "  export SUPABASE_ACCESS_TOKEN=sbp_xxxx"
  exit 1
fi

echo "=== migration ==="

MIGRATIONS_DIR="supabase/migrations"
APPLIED=0
SKIPPED=0

for sql_file in "$MIGRATIONS_DIR"/*.sql; do
  [[ -f "$sql_file" ]] || continue
  migration_name=$(basename "$sql_file")

  # 適用済みチェック: supabase_migrations テーブルを確認
  CHECK_SQL="SELECT COUNT(*) AS cnt FROM supabase_migrations.schema_migrations WHERE version = '${migration_name%.sql}';"
  RESULT=$(curl -s -X POST "$API_BASE" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$CHECK_SQL" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}" 2>&1)

  COUNT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['cnt'] if d else '0')" 2>/dev/null || echo "0")

  if [[ "$COUNT" != "0" ]]; then
    echo "  SKIP (already applied): $migration_name"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "  APPLY: $migration_name"
  SQL=$(cat "$sql_file")
  APPLY_RESULT=$(curl -s -X POST "$API_BASE" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$SQL" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}" 2>&1)

  if echo "$APPLY_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if isinstance(d, list) else 1)" 2>/dev/null; then
    echo "    => OK"
    APPLIED=$((APPLIED + 1))
  else
    echo "    => ERROR: $APPLY_RESULT"
    exit 1
  fi
done

echo "  migration done: applied=$APPLIED, skipped=$SKIPPED"

echo "=== deploy ==="

if [[ "$TARGET" == "prod" || "$TARGET" == "production" ]]; then
  echo "本番デプロイを実行します..."
  vercel --prod
else
  echo "プレビューデプロイを実行します..."
  vercel
fi
