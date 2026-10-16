#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: rollback-release.sh <deploy-root> <release-id>" >&2
  exit 64
fi

deploy_root="${1%/}"
release_id="$2"
if [[ -z "$deploy_root" || "$deploy_root" == "/" || "$deploy_root" != /* ]]; then
  echo "Deploy root must be an absolute non-root path." >&2
  exit 64
fi
if [[ ! "$release_id" =~ ^[A-Za-z0-9._-]{7,80}$ ]]; then
  echo "Release id contains unsupported characters." >&2
  exit 64
fi

release_dir="$deploy_root/releases/$release_id"
current_link="$deploy_root/current"
shared_dir="$deploy_root/shared"
exec 9>"$deploy_root/.deploy.lock"
flock -n 9 || { echo "Another deployment is already running." >&2; exit 75; }
if [[ ! -d "$release_dir" || ! -f "$release_dir/backend/artisan" ]]; then
  echo "Release is unavailable: $release_dir" >&2
  exit 66
fi

if [[ -f "$shared_dir/deployment-recovery-required" ]]; then
  echo "Schema recovery is required. Restore the matching database and storage snapshot before code rollback." >&2
  exit 78
fi
current_generation="$(cat "$current_link/.schema-generation" 2>/dev/null || true)"
target_generation="$(cat "$release_dir/.schema-generation" 2>/dev/null || true)"
if [[ "$current_generation" != "$target_generation" ]]; then
  echo "Code-only rollback crosses an incompatible database/storage generation. Restore a full deployment snapshot instead." >&2
  exit 78
fi

# Database migrations are forward-only during rollback. Every release must
# remain compatible with the current schema; destructive down migrations are
# intentionally never run automatically.
php "$release_dir/backend/artisan" migrate --force
php "$release_dir/backend/artisan" optimize
ln -sfn "$release_dir" "$deploy_root/.current-rollback"
mv -Tf "$deploy_root/.current-rollback" "$current_link"

echo "Rolled back application code to $release_id"
