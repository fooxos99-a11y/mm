#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: deploy-release.sh <deploy-root> <archive> <release-id>" >&2
  exit 64
fi

deploy_root="${1%/}"
archive="$2"
release_id="$3"
umask 002

# On the production VPS the deploy user may run artisan as www-data (see scripts/server/setup-momars-server.sh),
# so cache and log files stay writable by PHP-FPM.
artisan() {
  if sudo -n -u www-data true 2>/dev/null; then
    sudo -n -u www-data php "$@"
  else
    php "$@"
  fi
}

if [[ -z "$deploy_root" || "$deploy_root" == "/" || "$deploy_root" != /* ]]; then
  echo "Deploy root must be an absolute non-root path." >&2
  exit 64
fi
if [[ ! "$release_id" =~ ^[A-Za-z0-9._-]{7,80}$ ]]; then
  echo "Release id contains unsupported characters." >&2
  exit 64
fi
if [[ ! -f "$archive" ]]; then
  echo "Release archive does not exist: $archive" >&2
  exit 66
fi

releases_dir="$deploy_root/releases"
shared_dir="$deploy_root/shared"
release_dir="$releases_dir/$release_id"
current_link="$deploy_root/current"
previous_target=""
schema_started=0
maintenance_owned=0
backup_dir=""

mkdir -p "$releases_dir" "$shared_dir/storage"
exec 9>"$deploy_root/.deploy.lock"
flock -n 9 || { echo "Another deployment is already running." >&2; exit 75; }
if [[ -f "$shared_dir/deployment-recovery-required" ]]; then
  echo "A previous schema deployment requires database/storage recovery before another deployment." >&2
  exit 78
fi
if [[ -L "$current_link" ]]; then
  previous_target="$(readlink -f "$current_link")"
fi
if [[ -e "$release_dir" ]]; then
  echo "Release already exists: $release_dir" >&2
  exit 73
fi

rollback_on_error() {
  local exit_code=$?
  trap - EXIT HUP INT TERM
  [[ "$exit_code" -ne 0 ]] || exit 0
  if [[ "$schema_started" -eq 1 || -f "$shared_dir/deployment-recovery-required" ]]; then
    printf '%s\n' "$backup_dir" > "$shared_dir/deployment-recovery-required"
    chmod 600 "$shared_dir/deployment-recovery-required"
    [[ ! -f "$current_link/backend/artisan" ]] || artisan "$current_link/backend/artisan" down --retry=60 || true
    echo "Deployment failed after schema changes began. Maintenance remains enabled." >&2
    echo "Restore the verified database AND storage snapshot before reactivating old code: $backup_dir" >&2
  elif [[ -n "$previous_target" && -d "$previous_target" ]]; then
    ln -sfn "$previous_target" "$deploy_root/.current-rollback"
    mv -Tf "$deploy_root/.current-rollback" "$current_link"
    if [[ "$maintenance_owned" -eq 1 ]]; then
      artisan "$previous_target/backend/artisan" up || true
    fi
    echo "Deployment failed; current was restored to $previous_target" >&2
  fi
  exit "$exit_code"
}
trap rollback_on_error EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir "$release_dir"
tar -xzf "$archive" -C "$release_dir"

if [[ ! -f "$shared_dir/.env" ]]; then
  echo "Missing shared environment file: $shared_dir/.env" >&2
  exit 78
fi

ln -sfn "$shared_dir/.env" "$release_dir/backend/.env"
rm -rf "$release_dir/backend/storage"
ln -sfn "$shared_dir/storage" "$release_dir/backend/storage"

composer --working-dir="$release_dir/backend" install --no-dev --classmap-authoritative --no-interaction --no-progress

# Validate the bundled converter before maintenance or any schema work.
if [[ -f "$release_dir/runtime/qpdf-runner" ]]; then
  "$release_dir/runtime/qpdf-runner" --version
fi

# Shared storage includes the maintenance flag, so both releases stay closed while
# schema and legacy file locations change. Never expose old code to a partial schema.
if [[ ! -f "$shared_dir/storage/framework/down" ]]; then
  maintenance_owned=1
  if [[ -n "$previous_target" ]]; then
    artisan "$previous_target/backend/artisan" down --retry=60
  else
    artisan "$release_dir/backend/artisan" down --retry=60
  fi
fi
if [[ -n "$previous_target" ]]; then
  bash "$release_dir/scripts/quiesce-deployment.sh" "$deploy_root"
fi
backup_dir="$deploy_root/backups/$(date -u +%Y%m%dT%H%M%SZ)-$release_id"
mkdir -p "$deploy_root/backups"
chmod 700 "$deploy_root/backups"
mkdir -m 700 "$backup_dir"
php "$release_dir/scripts/backup-deployment.php" "$release_dir/backend" "$backup_dir"
cp "$shared_dir/.env" "$backup_dir/environment.env"
tar -czf "$backup_dir/storage.tgz" -C "$shared_dir" storage
gzip -t "$backup_dir/storage.tgz"
(cd "$backup_dir" && sha256sum database.* storage.tgz environment.env > SHA256SUMS)
chmod 600 "$backup_dir"/*
printf '%s\n' "$previous_target" > "$backup_dir/previous-release"
printf '%s\n' "$backup_dir" > "$release_dir/.deployment-backup"

# Persist recovery state before the first migration: an SSH disconnect or process
# termination must never leave a changed database eligible for code-only rollback.
printf '%s\n' "$backup_dir" > "$shared_dir/.deployment-recovery-required.next"
chmod 600 "$shared_dir/.deployment-recovery-required.next"
mv -f "$shared_dir/.deployment-recovery-required.next" "$shared_dir/deployment-recovery-required"
schema_started=1
artisan "$release_dir/backend/artisan" migrate --force
artisan "$release_dir/backend/artisan" department:secure-legacy-media --apply
php "$release_dir/backend/artisan" storage:link --force
chmod -R g+w "$release_dir/backend/bootstrap/cache"
artisan "$release_dir/backend/artisan" optimize
printf '%s\n' 'department-isolation-v1' > "$release_dir/.schema-generation"

ln -sfn "$release_dir" "$deploy_root/.current-next"
mv -Tf "$deploy_root/.current-next" "$current_link"
# Clear OPcache while requests still see the maintenance response.
sudo -n systemctl reload php8.3-fpm
# The idle queue process loaded the previous release before migration. Restart it
# after switching current and before allowing any new requests or background jobs.
sudo -n systemctl restart momars-queue
systemctl is-active --quiet momars-queue
if [[ "$maintenance_owned" -eq 1 ]]; then
  artisan "$current_link/backend/artisan" up
fi
rm -f "$shared_dir/deployment-recovery-required"
trap - EXIT HUP INT TERM

find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr \
  | awk 'NR > 5 { sub(/^[^ ]+ /, ""); print }' \
  | while IFS= read -r old_release; do
      [[ -n "$old_release" && "$old_release" != "$(readlink -f "$current_link")" ]] && rm -rf -- "$old_release"
    done

echo "Activated release $release_id"
