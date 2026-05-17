#!/usr/bin/env bash
# migrate.sh — Supabase Management API 経由でマイグレーションを適用する
# 必要な環境変数: SUPABASE_ACCESS_TOKEN
# オプション:    SUPABASE_PROJECT_REF (デフォルト: rwbfafdivhzfzzwrkviy)
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-rwbfafdivhzfzzwrkviy}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
API_BASE="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN が未設定です" >&2
  exit 1
fi

run_query() {
  local sql="$1"
  curl -sf -X POST "$API_BASE" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$sql" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}"
}

APPLIED=0
SKIPPED=0

for sql_file in "$MIGRATIONS_DIR"/*.sql; do
  [[ -f "$sql_file" ]] || continue
  migration_name=$(basename "$sql_file")
  version="${migration_name%.sql}"

  # 適用済みチェック
  result=$(run_query "SELECT COUNT(*) AS cnt FROM supabase_migrations.schema_migrations WHERE version = '${version}';")
  count=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['cnt'])" 2>/dev/null || echo "0")

  if [[ "$count" != "0" ]]; then
    echo "SKIP: $migration_name"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "APPLY: $migration_name"
  run_query "$(cat "$sql_file")" > /dev/null
  echo "  => OK"
  APPLIED=$((APPLIED + 1))
done

echo "done: applied=${APPLIED}, skipped=${SKIPPED}"
