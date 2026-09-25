#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
base=/var/www/momars
release="$base/deploy-20260905"
backup="$base/backups/release-$(date -u +%Y%m%dT%H%M%SZ)"
stage="$release/stage-$(date -u +%H%M%S)"
nginx=/etc/nginx/sites-enabled/license-qb.us
test -d "$base/backend/vendor"
test ! -e "$stage"
mkdir -p "$stage/backend" "$stage/license-dist" "$backup"
chmod 700 "$backup" "$release"
cp -a "$nginx" "$backup/nginx.conf"
rsync -a --exclude=/storage --exclude=/public/storage "$base/backend/" "$stage/backend/"
rsync -a "$release/payload/backend/" "$stage/backend/"
ln -s "$base/backend/storage" "$stage/backend/storage"
ln -s "$base/backend/public/storage" "$stage/backend/public/storage"
rm -f "$stage/backend/bootstrap/cache/config.php" "$stage/backend/bootstrap/cache/routes-v7.php"
rsync -a "$base/frontend/license-dist/" "$stage/license-dist/"
rsync -a "$release/payload/frontend/license-dist/" "$stage/license-dist/"
cd "$stage/backend"
COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload --optimize --no-scripts --no-interaction
php artisan route:list --path=dashboard/results
chown -R --no-dereference www-data:www-data "$stage/backend" "$stage/license-dist"
backend_moved=0
frontend_moved=0
rollback() {
  rc=$?
  trap - ERR
  set +e
  if [ "$frontend_moved" = 1 ]; then
    [ ! -e "$base/frontend/license-dist" ] || mv "$base/frontend/license-dist" "$stage/failed-license-dist"
    mv "$backup/license-dist" "$base/frontend/license-dist"
  fi
  if [ "$backend_moved" = 1 ]; then
    [ ! -e "$base/backend" ] || mv "$base/backend" "$stage/failed-backend"
    mv "$backup/backend" "$base/backend"
  fi
  cp -a "$backup/nginx.conf" "$nginx"
  nginx -t && systemctl reload nginx
  systemctl reload php8.3-fpm
  echo "DEPLOY FAILED; rollback attempted; backup=$backup"
  exit "$rc"
}
trap rollback ERR
ln -sfn "$backup/backend/storage" "$stage/backend/storage"
ln -sfn "$backup/backend/public/storage" "$stage/backend/public/storage"
# Storage remains in the retained backend backup and is shared by the release.
chmod 711 "$backup"
mv "$base/backend" "$backup/backend"
backend_moved=1
mv "$stage/backend" "$base/backend"
mv "$base/frontend/license-dist" "$backup/license-dist"
frontend_moved=1
mv "$stage/license-dist" "$base/frontend/license-dist"
cd "$base/backend"
php artisan config:cache
php artisan route:cache
php artisan view:clear
python3 - "$nginx" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
s = p.read_text()
start = s.index('    location /api/ {')
end = s.index('\n    }', start) + len('\n    }')
block = s[start:end]
extra = ''
for route in ['/sanctum/csrf-cookie', '/up']:
    if f'location = {route} ' not in s:
        extra += '\n\n' + block.replace('location /api/', f'location = {route}', 1)
s = s[:end] + extra + s[end:]
p.write_text(s)
PY
nginx -t
systemctl reload php8.3-fpm
systemctl reload nginx
check_status() {
  local path="$1" expected="$2" status
  for attempt in 1 2 3 4 5; do
    status=$(curl -sS -H 'Accept: application/json' -o "$release/check-body.txt" -w '%{http_code}' "https://license-qb.us$path")
    echo "CHECK $path status=$status expected=$expected"
    [ "$status" != "$expected" ] || return 0
    sleep 1
  done
  return 1
}
check_status /up 200
check_status /sanctum/csrf-cookie 204
check_status /api/auth/session 200
check_status /api/dashboard/results/catalog 401
curl -fsS https://license-qb.us/ -o "$release/live-index.html"
cmp "$release/live-index.html" "$release/payload/frontend/license-dist/index.html"
trap - ERR
echo "DEPLOY_OK backup=$backup"
