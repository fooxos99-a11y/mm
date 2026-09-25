#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
release=/var/www/momars/deploy-mobile-20260912
live=/var/www/momars/frontend/license-dist
backup=/var/www/momars/backups/mobile-20260912
test -f "$live/index.html"
test ! -e "$backup"
test ! -e "$release/stage"
mkdir "$release/stage"
tar -xzf "$release/frontend.tar.gz" -C "$release/stage"
test -f "$release/stage/index.html"
test -d "$release/stage/assets"
cp -a "$live" "$backup"
activated=0
rollback() {
  rc=$?
  trap - ERR
  if [ "$activated" = 1 ]; then
    cp -p "$backup/index.html" "$live/.index-rollback.html"
    mv -f "$live/.index-rollback.html" "$live/index.html"
  fi
  echo "DEPLOY_FAILED backup=$backup" >&2
  exit "$rc"
}
trap rollback ERR
# Keep previous hashed assets available for existing open sessions.
rsync -a --exclude=index.html "$release/stage/" "$live/"
chown -R www-data:www-data "$live"
cp "$release/stage/index.html" "$live/.index-next.html"
chown www-data:www-data "$live/.index-next.html"
chmod 644 "$live/.index-next.html"
mv -f "$live/.index-next.html" "$live/index.html"
activated=1
curl --retry 2 -fsS https://license-qb.us/ -o "$release/published-index.html"
cmp "$release/stage/index.html" "$release/published-index.html"
for path in /up /api/auth/session /login; do
  curl --retry 2 -fsS -o /dev/null "https://license-qb.us$path"
  echo "CHECK $path OK"
done
test "$(curl -sS -o /dev/null -w '%{http_code}' https://license-qb.us/api/dashboard/results/catalog)" = 401
trap - ERR
echo "DEPLOY_OK backup=$backup"
