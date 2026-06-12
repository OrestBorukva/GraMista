#!/usr/bin/env bash
# Щоденний дамп БД GraMista + ротація 14 днів. Викликається з cron на VPS:
#   /etc/cron.d/gramista-backup → 30 4 * * * root /opt/gramista/deploy/backup.sh
set -euo pipefail

BACKUP_DIR=/opt/gramista-backups
COMPOSE_FILE=/opt/gramista/docker-compose.prod.yml

mkdir -p "$BACKUP_DIR"
docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U gramista gramista \
  | gzip > "$BACKUP_DIR/gramista-$(date +%F).sql.gz"
find "$BACKUP_DIR" -name 'gramista-*.sql.gz' -mtime +14 -delete
