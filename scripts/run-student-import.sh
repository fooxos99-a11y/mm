#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ "$OPERATION" =~ ^(inspect|preview|apply|verify)$ ]] || exit 64
[[ "$DEPLOY_ROOT" =~ ^/[A-Za-z0-9_./-]+$ ]] || exit 64
if [[ "$OPERATION" != inspect ]]; then
  [[ "$DEPARTMENT_ID" =~ ^[a-f0-9-]{36}$ ]] || exit 64
  [[ "$DEPARTMENT_NAME" != *"'"* && "$DEPARTMENT_NAME" != *$'\n'* ]] || exit 64
fi
remote_file="/tmp/momars-students-${GITHUB_RUN_ID}.json"
remote_script="/tmp/momars-student-operation-${GITHUB_RUN_ID}.sh"
cleanup() {
  ssh -T -o BatchMode=yes "${DEPLOY_USER}@${DEPLOY_HOST}" "rm -f -- '$remote_file' '$remote_script'" >/dev/null 2>&1 || true
}
trap cleanup EXIT
script="$RUNNER_TEMP/student-operation.sh"
{
  echo '#!/usr/bin/env bash'
  echo 'set -euo pipefail; umask 077'
  printf "cd '%s/current/backend'\n" "$DEPLOY_ROOT"
  if [[ "$OPERATION" == inspect ]]; then
    echo 'php artisan students:import --inspect'
  elif [[ "$OPERATION" == verify ]]; then
    [[ "$BATCH_ID" =~ ^[a-f0-9-]{36}$ ]] || exit 64
    printf "php artisan students:import --department='%s' --department-name='%s' --verify='%s'\n" "$DEPARTMENT_ID" "$DEPARTMENT_NAME" "$BATCH_ID"
  else
    [[ "$EXPECTED_COUNT" =~ ^[0-9]+$ ]] || exit 64
    [[ -n "$STUDENT_BATCH" ]] || exit 78
    printf '%s' "$STUDENT_BATCH" | base64 --decode | gzip --decompress > "$RUNNER_TEMP/students.json"
    ssh -T -o BatchMode=yes "${DEPLOY_USER}@${DEPLOY_HOST}" "umask 077; : > '$remote_file'"
    scp "$RUNNER_TEMP/students.json" "${DEPLOY_USER}@${DEPLOY_HOST}:${remote_file}"
    if [[ "$OPERATION" == apply ]]; then
      [[ "$EXPECTED_STUDENTS" =~ ^[0-9]+$ ]] || exit 64
      printf "backup='%s/backups/student-import-%s'\nmkdir -m 700 -p \"\$backup\"\n" "$DEPLOY_ROOT" "$GITHUB_RUN_ID"
      echo 'php ../scripts/backup-deployment.php "$PWD" "$backup"'
    fi
    printf "php artisan students:import '%s' --department='%s' --department-name='%s' --expected-count='%s'" "$remote_file" "$DEPARTMENT_ID" "$DEPARTMENT_NAME" "$EXPECTED_COUNT"
    if [[ "$OPERATION" == apply ]]; then printf " --apply --expected-students='%s'" "$EXPECTED_STUDENTS"; fi
    printf '\n'
  fi
} > "$script"
scp "$script" "${DEPLOY_USER}@${DEPLOY_HOST}:${remote_script}"
ssh -T -o BatchMode=yes "${DEPLOY_USER}@${DEPLOY_HOST}" "chmod 600 '$remote_file' 2>/dev/null || true; bash '$remote_script'"
