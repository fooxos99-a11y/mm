#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: deploy-release.sh <deploy-root> <archive> <release-id>" >&2
  exit 64
fi

deploy_root="${1%/}"
archive="$2"
release_id="$3"

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

mkdir -p "$releases_dir" "$shared_dir/storage"
if [[ -L "$current_link" ]]; then
  previous_target="$(readlink -f "$current_link")"
fi
if [[ -e "$release_dir" ]]; then
  echo "Release already exists: $release_dir" >&2
  exit 73
fi

rollback_on_error() {
  local exit_code=$?
  if [[ -n "$previous_target" && -d "$previous_target" ]]; then
    ln -sfn "$previous_target" "$deploy_root/.current-rollback"
    mv -Tf "$deploy_root/.current-rollback" "$current_link"
    echo "Deployment failed; current was restored to $previous_target" >&2
  fi
  exit "$exit_code"
}
trap rollback_on_error ERR

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
php "$release_dir/backend/artisan" migrate --force
php "$release_dir/backend/artisan" optimize

ln -sfn "$release_dir" "$deploy_root/.current-next"
mv -Tf "$deploy_root/.current-next" "$current_link"
trap - ERR

find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr \
  | awk 'NR > 5 { sub(/^[^ ]+ /, ""); print }' \
  | while IFS= read -r old_release; do
      [[ -n "$old_release" && "$old_release" != "$(readlink -f "$current_link")" ]] && rm -rf -- "$old_release"
    done

echo "Activated release $release_id"
