# Production deployment — 2026-09-05

- URL: https://license-qb.us/
- Host: 161.97.171.108
- Backend: /var/www/momars/backend
- Domain frontend: /var/www/momars/frontend/license-dist
- Retained release and payload: /var/www/momars/deploy-20260905
- Active rollback backup: /var/www/momars/backups/release-20260905T135319Z
- IMPORTANT: Active backend/storage and backend/public/storage link to corresponding directories inside the retained backup/backend. Do not delete or move that backup: it contains live writable uploads, sessions/cache/log data. A future cleanup must first move storage into a permanent shared directory and repoint these links.
- Remote .env and database preserved; no migrations or SQL changes executed.
- Nginx routes /sanctum/csrf-cookie and /up now reach Laravel.
- HTTP checks: /up 200; csrf-cookie 204; auth/session 200; protected results/catalog 401; published index byte-matches local production build.
- Login browser smoke passed at 320px and 1440px, without JS errors, server errors, or horizontal overflow.
- First activation was automatically rolled back after an immediate HTTP check failed; second activation passed all checks. Check script now allows service reloads to settle.
- Local validation: 151 backend tests, 90 frontend unit tests, results E2E mobile and desktop, lint and bundle budget.
