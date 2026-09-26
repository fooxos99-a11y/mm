#!/usr/bin/env bash
# One-time preparation of the VPS for automatic deploys from GitHub.
# Run as root on the server:  bash setup-momars-server.sh
# It does NOT touch the live site; the old site keeps running until cutover-momars.sh.
set -Eeuo pipefail

DOMAIN="license-qb.us"
SERVER_IP="161.97.171.108"
OLD_ROOT="/var/www/momars"
DEPLOY_ROOT="/var/www/momars-app"
DEPLOY_USER="momars-deploy"
PHP_FPM_SERVICE="php8.3-fpm"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/momars-$STAMP"

[[ $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
[[ -f "$OLD_ROOT/backend/.env" ]] || { echo "Missing $OLD_ROOT/backend/.env" >&2; exit 1; }

echo "== 1/6 Backup old site and database -> $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
tar --exclude='backend/vendor' --exclude='frontend/node_modules' -czf "$BACKUP_DIR/momars-files.tgz" -C /var/www momars
db_name="$(grep -E '^DB_DATABASE=' "$OLD_ROOT/backend/.env" | cut -d= -f2-)"
mysqldump --single-transaction --routines "$db_name" | gzip > "$BACKUP_DIR/momars-db.sql.gz"
old_storage="$(readlink -f "$OLD_ROOT/backend/storage")"
tar -czf "$BACKUP_DIR/momars-storage.tgz" -C "$(dirname "$old_storage")" "$(basename "$old_storage")"

echo "== 2/6 Deploy user $DEPLOY_USER"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
fi
usermod -aG www-data "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
key_file="/root/momars-deploy-key"
if [[ ! -f "$key_file" ]]; then
  ssh-keygen -t ed25519 -N '' -C "github-actions-momars" -f "$key_file" >/dev/null
fi
cp "$key_file.pub" "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
cat > /etc/sudoers.d/momars-deploy <<SUDO
$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl reload $PHP_FPM_SERVICE, /usr/bin/systemctl restart momars-queue
$DEPLOY_USER ALL=(www-data) NOPASSWD: /usr/bin/php, /usr/bin/true
SUDO
chmod 440 /etc/sudoers.d/momars-deploy
visudo -cf /etc/sudoers.d/momars-deploy >/dev/null

echo "== 3/6 Release folders in $DEPLOY_ROOT"
install -d -m 2775 -o "$DEPLOY_USER" -g www-data "$DEPLOY_ROOT" "$DEPLOY_ROOT/releases" "$DEPLOY_ROOT/shared"
if [[ ! -d "$DEPLOY_ROOT/shared/storage" ]]; then
  cp -a "$old_storage" "$DEPLOY_ROOT/shared/storage"
fi
chown -R "$DEPLOY_USER:www-data" "$DEPLOY_ROOT/shared/storage"
find "$DEPLOY_ROOT/shared/storage" -type d -exec chmod 2775 {} +
find "$DEPLOY_ROOT/shared/storage" -type f -exec chmod 664 {} +

echo "== 4/6 Shared .env (copied from the current site)"
if [[ ! -f "$DEPLOY_ROOT/shared/.env" ]]; then
  cp "$OLD_ROOT/backend/.env" "$DEPLOY_ROOT/shared/.env"
  # New uploads are served from the domain root; old /momars/storage links keep working (see cutover).
  sed -i 's/^APP_PUBLIC_BASE_PATH=.*/APP_PUBLIC_BASE_PATH=/' "$DEPLOY_ROOT/shared/.env"
fi
chown "$DEPLOY_USER:www-data" "$DEPLOY_ROOT/shared/.env"
chmod 640 "$DEPLOY_ROOT/shared/.env"

echo "== 5/6 Tools for the deploy user"
command -v composer >/dev/null || { echo "composer is required" >&2; exit 1; }
sudo -u "$DEPLOY_USER" -H composer --version >/dev/null

echo "== 6/6 Values for GitHub (Settings > Environments > production > Secrets)"
echo
echo "DEPLOY_HOST        = $SERVER_IP"
echo "DEPLOY_USER        = $DEPLOY_USER"
echo "DEPLOY_ROOT        = $DEPLOY_ROOT"
echo "DEPLOY_URL         = https://$DOMAIN/"
echo "DEPLOY_CORS_ORIGIN = https://$DOMAIN"
echo
echo "DEPLOY_KNOWN_HOSTS ="
ssh-keyscan -t ed25519 "$SERVER_IP" 2>/dev/null
echo
echo "DEPLOY_SSH_KEY (copy everything between the lines, including BEGIN/END) ="
echo "-----------------------------------------------------------------------"
cat "$key_file"
echo "-----------------------------------------------------------------------"
echo
echo "Backup saved in $BACKUP_DIR. The live site is unchanged."
