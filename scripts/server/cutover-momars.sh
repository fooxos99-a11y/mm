#!/usr/bin/env bash
# Switch the live site to the release deployed by GitHub Actions.
# Run as root on the server AFTER the first successful "Deploy release" run:  bash cutover-momars.sh
set -Eeuo pipefail

DOMAIN="license-qb.us"
OLD_ROOT="/var/www/momars"
DEPLOY_ROOT="/var/www/momars-app"
CURRENT="$DEPLOY_ROOT/current"
PHP_SOCK="unix:/run/php/php8.3-fpm.sock"
STAMP="$(date +%Y%m%d-%H%M%S)"
SITE="/etc/nginx/sites-enabled/$DOMAIN"
SNIPPET="/etc/nginx/snippets/momars-locations.conf"

[[ $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
[[ -f "$CURRENT/frontend/dist/index.html" ]] || { echo "No deployed release at $CURRENT yet. Run the GitHub deploy first." >&2; exit 1; }

cp "$SITE" "/root/nginx-$DOMAIN-$STAMP.bak"
cp "$SNIPPET" "/root/nginx-momars-locations-$STAMP.bak"
cp /etc/systemd/system/momars-queue.service "/root/momars-queue-$STAMP.bak"

laravel_block() {
  cat <<BLOCK
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $CURRENT/backend/public/index.php;
        fastcgi_param SCRIPT_NAME /index.php;
        fastcgi_param DOCUMENT_ROOT $CURRENT/backend/public;
        fastcgi_param REQUEST_URI \$request_uri;
        fastcgi_param PATH_INFO \$uri;
        fastcgi_param HTTPS \$https if_not_empty;
        fastcgi_pass $PHP_SOCK;
BLOCK
}

# Domain site: same structure as before, pointed at the "current" release.
python3 - "$SITE" "$CURRENT" <<'PY'
import sys, re
path, current = sys.argv[1], sys.argv[2]
s = open(path).read()
s = s.replace('/var/www/momars/frontend/license-dist', current + '/frontend/dist')
s = s.replace('/var/www/momars/backend/public', current + '/backend/public')
s = s.replace('/var/www/momars/backend/storage/app/public/', current + '/backend/storage/app/public/')
if 'location /momars/storage/' not in s:
    # Files uploaded by the old version were linked as /momars/storage/...
    s = s.replace('    location /storage/ {', '    location /momars/storage/ {\n        alias ' + current + '/backend/storage/app/public/;\n        try_files $uri =404;\n    }\n\n    location /storage/ {', 1)
open(path, 'w').write(s)
PY

# IP address /momars: old links keep working and move to the domain.
cat > "$SNIPPET" <<CONF
location /momars/storage/ {
    alias $CURRENT/backend/storage/app/public/;
    try_files \$uri =404;
}

location /momars {
    return 301 https://$DOMAIN/;
}
CONF

sed -i "s#^WorkingDirectory=.*#WorkingDirectory=$CURRENT/backend#" /etc/systemd/system/momars-queue.service

nginx -t
systemctl daemon-reload
systemctl reload nginx
systemctl reload php8.3-fpm
systemctl restart momars-queue

mv "$OLD_ROOT" "/var/www/momars-old-$STAMP"
echo "Live site now served from $CURRENT"
echo "Old files moved to /var/www/momars-old-$STAMP (delete it later once everything works)."
echo "Rollback: restore /root/*-$STAMP.bak files, move the old folder back, reload nginx."
