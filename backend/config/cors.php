<?php

$allowedOrigins = array_values(array_filter(array_map(
    'trim',
    explode(
        ',',
        (string) env(
            'CORS_ALLOWED_ORIGINS',
            'http://127.0.0.1:8080,http://localhost:8080',
        ),
    ),
)));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/assessment-attachments/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $allowedOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['Accept-Ranges', 'Content-Range', 'Content-Length', 'ETag'],
    'max_age' => 0,
    'supports_credentials' => true,
];
