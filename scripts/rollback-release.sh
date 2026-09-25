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
if [[ ! -d "$release_dir" || ! -f "$release_dir/backend/artisan" ]]; then
  echo "Release is unavailable: $release_dir" >&2
  exit 66
fi

# Database migrations are forward-only during rollback. Every release must
# remain compatible with the current schema; destructive down migrations are
# intentionally never run automatically.
php "$release_dir/backend/artisan" migrate --force
php "$release_dir/backend/artisan" optimize
ln -sfn "$release_dir" "$deploy_root/.current-rollback"
mv -Tf "$deploy_root/.current-rollback" "$current_link"

echo "Rolled back application code to $release_id"
