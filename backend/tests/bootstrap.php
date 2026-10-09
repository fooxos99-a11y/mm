<?php

$autoloadPath = dirname(__DIR__).'/vendor/autoload.php';
$testingEnvironmentPath = dirname(__DIR__).'/.env.testing';
$createdTestingEnvironment = false;
$testStoragePath = sys_get_temp_dir().'/momars-unit-'.getmypid().'-'.bin2hex(random_bytes(4));
foreach (['app/private', 'app/public', 'framework/cache/data', 'framework/sessions', 'framework/views', 'framework/testing', 'logs'] as $directory) {
    mkdir($testStoragePath.'/'.$directory, 0777, true);
}
putenv('LARAVEL_STORAGE_PATH='.$testStoragePath);
$_ENV['LARAVEL_STORAGE_PATH'] = $testStoragePath;
$_SERVER['LARAVEL_STORAGE_PATH'] = $testStoragePath;

if (! is_file($testingEnvironmentPath)) {
    file_put_contents($testingEnvironmentPath, "APP_ENV=testing\n");
    $createdTestingEnvironment = true;
}

if ($createdTestingEnvironment) {
    register_shutdown_function(static function () use ($testingEnvironmentPath): void {
        @unlink($testingEnvironmentPath);
    });
}

require $autoloadPath;
