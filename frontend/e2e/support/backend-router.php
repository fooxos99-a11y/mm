<?php

// The test server serves public uploads from its temporary storage, without changing the workspace symlink.
$storage = getenv('LARAVEL_STORAGE_PATH');
$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
if ($storage && str_starts_with($uri, '/storage/')) {
    $root = realpath($storage.'/app/public');
    $file = $root ? realpath($root.'/'.substr($uri, strlen('/storage/'))) : false;
    if ($root && $file && str_starts_with($file, $root.DIRECTORY_SEPARATOR) && is_file($file)) {
        header('Content-Type: '.(mime_content_type($file) ?: 'application/octet-stream'));
        header('X-Content-Type-Options: nosniff');
        readfile($file);

        return true;
    }
}
require dirname(__DIR__, 3).'/backend/server.php';
