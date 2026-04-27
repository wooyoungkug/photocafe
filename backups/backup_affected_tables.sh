#!/usr/bin/env bash
# 운영 DB 의 삭제 대상 테이블만 CSV + DDL 로 백업.
# pg_dump 버전 mismatch (16↔18) 우회용 — psql \copy 만 사용.
set -euo pipefail

PGCONN=( -h shinkansen.proxy.rlwy.net -p 50158 -U postgres -d railway )
PSQL="/c/Program Files/PostgreSQL/16/bin/psql.exe"
TS=$(date +%Y%m%d_%H%M)
DIR="c:/dev/Photocafe/backups/prod_purge_${TS}"
mkdir -p "$DIR"

TABLES=(
  orders order_items order_files
  order_shippings order_item_shippings
  imposition_jobs pdf_job_items
  process_histories copper_plate_histories
  photobook_files
  return_requests return_request_items
  consultations
  quotations
  sales_ledgers sales_ledger_items
  receivables
  journals
)

echo "=== Backup target: $DIR ==="
echo "=== Tables: ${TABLES[*]} ==="

# 각 테이블을 CSV 로 dump (\copy 는 클라이언트측 명령이라 권한/버전 무관하게 동작)
for t in "${TABLES[@]}"; do
  out="$DIR/$t.csv"
  echo "[*] $t → $out"
  PGPASSWORD='y8Sh7QH52XwTlOEbv4uK9DYrZIiAcpNd' "$PSQL" "${PGCONN[@]}" \
    -c "\copy (SELECT * FROM \"$t\") TO '$out' WITH CSV HEADER" 2>&1 | tail -1
done

echo ""
echo "=== Sizes ==="
ls -lh "$DIR/" | tail -n +2

echo ""
echo "=== Done. Backup at: $DIR ==="
