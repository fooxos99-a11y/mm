<?php

return [
    'max_recent_errors' => (int) env('HEALTH_MAX_ERRORS_5M', 10),
    'max_recent_client_errors' => (int) env('HEALTH_MAX_CLIENT_ERRORS_5M', 20),
    'max_pending_jobs' => (int) env('HEALTH_MAX_PENDING_JOBS', 1000),
    'max_failed_jobs' => (int) env('HEALTH_MAX_FAILED_JOBS', 5),
];
