#!/usr/bin/env bash
# backupDB.sh
# Edit the variables below or set env var DATABASE_URL to override.
# WARNING: keep this file private if you fill in secrets.

set -euo pipefail

# ----------------- FILL THESE IN (or set DATABASE_URL env var) -----------------
# Example: USER='myuser' PASSWORD='p%40ssw0rd' HOST='db.prisma.io' PORT='5432' DB='postgres'
USER='3b0475e023be9d3484d9460338cdd956e3d9b7d154830c14b7605cc798ef834a'
PASSWORD='sk_FC5PbzS8jjbXifH_y7h_1'
HOST='db.prisma.io'
PORT='5432'
DB='postgres'
SSLMODE='require'   # optional; set to 'require' if your connection needs SSL
# ------------------------------------------------------------------------------

print_usage() {
  cat <<EOF
Usage:
  1) Edit the top of this file to set USER, PASSWORD, HOST, PORT, DB (or set DATABASE_URL env var).
  2) Run:
       ./backupDB.sh [output_dir]
  Or provide DATABASE_URL at runtime:
       DATABASE_URL='postgres://user:pass@host:5432/db?sslmode=require' ./backupDB.sh ./backups
EOF
}

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump not found in PATH. Install Postgres client tools and retry."
  exit 2
fi

OUT_DIR="${1:-./db_backups}"
mkdir -p "$OUT_DIR"

# Build DATABASE_URL if not provided via env
if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL_VAL="$DATABASE_URL"
else
  # require variables
  if [ -z "$USER" ] || [ -z "$PASSWORD" ] || [ -z "$HOST" ] || [ -z "$PORT" ] || [ -z "$DB" ]; then
    echo "Error: Either set DATABASE_URL env var or fill USER/PASSWORD/HOST/PORT/DB at the top of this script."
    print_usage
    exit 1
  fi
  # Note: If your password contains special characters, URL-encode it.
  if [ -n "$SSLMODE" ]; then
    DATABASE_URL_VAL="postgres://${USER}:${PASSWORD}@${HOST}:${PORT}/${DB}?sslmode=${SSLMODE}"
  else
    DATABASE_URL_VAL="postgres://${USER}:${PASSWORD}@${HOST}:${PORT}/${DB}"
  fi
fi

# Refuse prisma+postgres style URLs
if [[ "$DATABASE_URL_VAL" =~ ^prisma\+postgres:// ]]; then
  echo "Error: detected prisma+postgres URL. pg_dump requires a direct Postgres connection (postgres://...)."
  echo "Please generate a direct Postgres connection string from the Prisma Console (Connect → Any client)."
  exit 3
fi

# Remove scheme prefix to inspect userinfo
CREDS_AND_REST=$(echo "$DATABASE_URL_VAL" | sed -E 's#^[a-zA-Z0-9+._-]+://##')

if [[ "$CREDS_AND_REST" == *"@"* ]]; then
  CREDS=$(echo "$CREDS_AND_REST" | cut -d'@' -f1)
  SANITIZED_URL="$(echo "$DATABASE_URL_VAL" | sed -E 's#(//)[^@]+@#\1#')"
  USERNAME="$(echo "$CREDS" | cut -d: -f1)"
  PASSWORD_EXTRACTED="$(echo "$CREDS" | cut -d: -f2-)"
else
  SANITIZED_URL="$DATABASE_URL_VAL"
  USERNAME=""
  PASSWORD_EXTRACTED=""
fi

# If sslmode=require present, set PGSSLMODE
if echo "$DATABASE_URL_VAL" | grep -qi 'sslmode=require'; then
  export PGSSLMODE=require
fi

# Export password to PGPASSWORD if present (keeps it out of ps args)
if [ -n "${PASSWORD_EXTRACTED:-}" ]; then
  export PGPASSWORD="$PASSWORD_EXTRACTED"
elif [ -n "${PASSWORD:-}" ]; then
  export PGPASSWORD="$PASSWORD"
fi

TS=$(date +%F_%H%M%S)
OUTFILE="${OUT_DIR}/pg_backup_${TS}.dump"

echo "Starting pg_dump to $OUTFILE ..."
# Use sanitized URL to avoid password leakage in command line
pg_dump "$SANITIZED_URL" -F c -b -v -f "$OUTFILE"
DUMP_EXIT=$?

# Clear sensitive env vars
if [ -n "${PGPASSWORD:-}" ]; then
  unset PGPASSWORD
fi
if [ -n "${PGSSLMODE:-}" ]; then
  unset PGSSLMODE
fi

if [ "$DUMP_EXIT" -eq 0 ]; then
  echo "Backup completed: $OUTFILE"
  exit 0
else
  echo "pg_dump failed with exit code $DUMP_EXIT"
  exit $DUMP_EXIT
fi
