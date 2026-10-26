#!/usr/bin/env bash
set -Eeuo pipefail

[[ $# -eq 1 && -f "$1/current/backend/artisan" ]] || { echo "Missing current application." >&2; exit 64; }
deploy_root="$1"
artisan() {
  if sudo -n -u www-data true 2>/dev/null; then sudo -n -u www-data php "$@"; else php "$@"; fi
}
stamp() {
  local process_stat
  local -a fields
  [[ -r "/proc/$1/stat" ]] || return 1
  process_stat="$(<"/proc/$1/stat")"
  read -r -a fields <<< "${process_stat##*) }"
  printf '%s' "${fields[19]}"
}
wait_for_exit() {
  local label="$1" process process_id expected deadline=$((SECONDS + 240))
  shift
  for process in "$@"; do
    process_id="${process%%:*}"
    expected="${process#*:}"
    while [[ -d "/proc/$process_id" && "$(stamp "$process_id" || true)" == "$expected" ]]; do
      if [[ "$SECONDS" -ge "$deadline" ]]; then
        echo "$label did not drain; deployment stopped before backup or schema changes." >&2
        exit 75
      fi
      sleep 1
    done
  done
}

queue_command="$(systemctl show momars-queue --property=ExecStart --value)"
queue_working_directory="$(systemctl show momars-queue --property=WorkingDirectory --value)"
if [[ "$queue_working_directory" != "$deploy_root/current/backend" ]]; then
  echo "Queue service must use the current release backend as its working directory." >&2
  exit 78
fi
if [[ "$queue_command" != *queue:work* || "$queue_command" == *--force* ]]; then
  echo "Queue service must use maintenance-aware queue:work without --force." >&2
  exit 78
fi
if [[ "$queue_command" != *' artisan queue:work'* && "$queue_command" != *" $deploy_root/current/backend/artisan queue:work"* ]]; then
  echo "Queue executable must use relative artisan or the current release artisan path." >&2
  exit 78
fi
queue_pid="$(systemctl show momars-queue --property=MainPID --value)"
fpm_pid="$(systemctl show php8.3-fpm --property=MainPID --value)"
[[ "$queue_pid" =~ ^[0-9]+$ && "$fpm_pid" =~ ^[1-9][0-9]*$ ]] || { echo "Could not identify running services." >&2; exit 78; }
children_file="/proc/$fpm_pid/task/$fpm_pid/children"
[[ -r "$children_file" ]] || { echo "Cannot verify existing PHP-FPM requests have drained." >&2; exit 78; }
fpm_children="$(<"$children_file")"
declare -a fpm_processes=()
for child in $fpm_children; do
  child_stamp="$(stamp "$child" || true)"
  if [[ -z "$child_stamp" && -d "/proc/$child" ]]; then
    echo "Cannot verify an existing PHP-FPM process." >&2
    exit 78
  fi
  [[ -z "$child_stamp" ]] || fpm_processes+=("$child:$child_stamp")
done
queue_stamp="$(stamp "$queue_pid" || true)"
if [[ -z "$queue_stamp" && -d "/proc/$queue_pid" ]]; then
  echo "Cannot verify the existing queue process." >&2
  exit 78
fi

# Graceful FPM reload retires the old workers after their current requests finish.
# New workers encounter the maintenance response and cannot start application writes.
sudo -n systemctl reload php8.3-fpm
wait_for_exit 'PHP-FPM requests' "${fpm_processes[@]}"
if [[ "$queue_pid" != 0 && -n "$queue_stamp" ]]; then
  # Advance beyond a possibly identical restart timestamp, then wait for the old
  # Laravel worker to finish its active job and exit naturally (never SIGKILL it).
  sleep 1
  artisan "$deploy_root/current/backend/artisan" queue:restart
  wait_for_exit 'Active queue job' "$queue_pid:$queue_stamp"
fi
# The previous worker is now gone. A synchronous service restart affects only idle
# replacement workers, which are required above to respect maintenance mode.
sudo -n systemctl restart momars-queue
systemctl is-active --quiet momars-queue
echo "Existing PHP requests and queue jobs have drained."
