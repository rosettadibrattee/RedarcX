#!/bin/bash
set -euo pipefail

: "${PORT:=10000}"

is_true() {
  local value="${1:-}"
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  [[ "$value" == "1" || "$value" == "true" || "$value" == "yes" || "$value" == "on" ]]
}

sanitize_port() {
  local raw="${1:-}"
  if [[ "$raw" =~ ^[0-9]+$ ]]; then
    printf '%s' "$raw"
  else
    printf '5432'
  fi
}

run_psql() {
  local host="$1" port="$2" db="$3" user="$4" file="$5"
  echo "Running ${file} on ${host}:${port}/${db} as ${user}"
  psql -v ON_ERROR_STOP=1 -h "$host" -U "$user" -p "$port" -d "$db" -a -f "$file"
}

if is_true "${DEMO:-false}"; then
  echo "DEMO=true detected. Skipping Postgres schema setup."
else
  : "${PG_HOST:?PG_HOST is required}"
  : "${PG_PASSWORD:?PG_PASSWORD is required}"
  : "${PG_DATABASE:=postgres}"
  : "${PG_USER:=postgres}"
  : "${PG_PORT:=5432}"

  : "${PGFTS_HOST:?PGFTS_HOST is required}"
  : "${PGFTS_PASSWORD:?PGFTS_PASSWORD is required}"
  : "${PGFTS_DATABASE:=postgres}"
  : "${PGFTS_USER:=postgres}"
  : "${PGFTS_PORT:=5432}"

  PG_PORT="$(sanitize_port "$PG_PORT")"
  PGFTS_PORT="$(sanitize_port "$PGFTS_PORT")"

  export PGPASSWORD="$PG_PASSWORD"
  run_psql "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$PG_USER" scripts/db_submissions.sql
  run_psql "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$PG_USER" scripts/db_comments.sql
  run_psql "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$PG_USER" scripts/db_subreddits.sql
  run_psql "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$PG_USER" scripts/db_comments_index.sql
  run_psql "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$PG_USER" scripts/db_submissions_index.sql
  run_psql "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$PG_USER" scripts/db_status_comments.sql
  run_psql "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$PG_USER" scripts/db_status_submissions.sql
  run_psql "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$PG_USER" scripts/db_progress.sql
  run_psql "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$PG_USER" scripts/db_watchedsubreddits.sql
  unset PGPASSWORD

  export PGPASSWORD="$PGFTS_PASSWORD"
  run_psql "$PGFTS_HOST" "$PGFTS_PORT" "$PGFTS_DATABASE" "$PGFTS_USER" scripts/db_fts.sql
  unset PGPASSWORD
fi

: "${API_PORT:=18000}"
if is_true "${DEMO:-false}"; then
  : "${GUNICORN_WORKERS:=1}"
else
  : "${GUNICORN_WORKERS:=4}"
fi

# Start API (internal)
cd /redarc/api
gunicorn \
  --workers="${GUNICORN_WORKERS}" \
  --bind="127.0.0.1:${API_PORT}" \
  --timeout="${GUNICORN_TIMEOUT:-600}" \
  --graceful-timeout="${GUNICORN_GRACEFUL_TIMEOUT:-30}" \
  --access-logfile - \
  --error-logfile - \
  app:app &

# Build frontend
cd /redarc/frontend
echo "VITE_API_DOMAIN=${REDARC_FE_API:-/api}" > .env
npm run build

mkdir -p /var/www/html/redarc/
cp -R dist/* /var/www/html/redarc/

# NGINX config
cd /redarc/nginx
python3 nginx_envar.py

if [[ -f redarc.conf ]]; then
  mv redarc.conf /etc/nginx/http.d/redarc.conf
fi

if [[ -f /etc/nginx/http.d/redarc.conf ]]; then
  sed -i -E "s/listen[[:space:]]+[0-9]+;/listen ${PORT};/g" /etc/nginx/http.d/redarc.conf
  sed -i -E "s/listen[[:space:]]+\[::\]:[0-9]+;/listen [::]:${PORT};/g" /etc/nginx/http.d/redarc.conf
fi

nginx -g "daemon off;"
