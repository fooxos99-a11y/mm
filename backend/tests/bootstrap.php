<?php

$autoloadPath = dirname(__DIR__).'/vendor/autoload.php';
$testingEnvironmentPath = dirname(__DIR__).'/.env.testing';
$createdTestingEnvironment = false;

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
