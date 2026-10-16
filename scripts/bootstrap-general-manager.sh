#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 3 || ! "$2" =~ ^[0-9]{4,100}$ || ! "$1" =~ ^[A-Za-z0-9+/=]+$ || ! "$3" =~ ^[A-Za-z0-9+/=]+$ ]]; then
  echo "Invalid account bootstrap arguments." >&2
  exit 64
fi
deploy_root="$(printf '%s' "$1" | base64 --decode)"
manager_name="$(printf '%s' "$3" | base64 --decode)"
if [[ "$deploy_root" != /* || "$deploy_root" == "/" || "$deploy_root" == *$'\n'* || "$deploy_root" == *$'\r'* ]]; then
  echo "Invalid deployment root." >&2
  exit 64
fi
exec 9>"$deploy_root/.deploy.lock"
flock -n 9 || { echo "A deployment is in progress." >&2; exit 75; }
if [[ ! -f "$deploy_root/current/backend/artisan" || -f "$deploy_root/shared/deployment-recovery-required" ]]; then
  echo "The deployed application is unavailable or requires recovery." >&2
  exit 78
fi

# The inherited standard input is the password pipe. It is never read into a shell
# variable, written to disk, or included in the process arguments.
if sudo -n -u www-data true 2>/dev/null; then
  sudo -n -u www-data php "$deploy_root/current/backend/artisan" \
    departments:create-general-manager --password-stdin --no-interaction -- "$2" "$manager_name"
else
  php "$deploy_root/current/backend/artisan" \
    departments:create-general-manager --password-stdin --no-interaction -- "$2" "$manager_name"
fi
