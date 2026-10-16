<?php

declare(strict_types=1);

// Credentials come from Laravel's server-side configuration and a private temporary
// option file. They never become process arguments or deployment log output.
if ($argc !== 3) {
    fwrite(STDERR, "Usage: backup-deployment.php <backend-path> <private-backup-directory>\n");
    exit(64);
}

$backendPath = realpath($argv[1]);
$backupPath = realpath($argv[2]);
$optionFile = null;
$dumpFile = null;
$exitCode = 0;
umask(0077);

try {
    if ($backendPath === false || $backupPath === false || ! is_dir($backupPath)
        || ! is_file($backendPath.'/vendor/autoload.php') || ! is_file($backendPath.'/bootstrap/app.php')) {
        throw new RuntimeException('Backup paths are unavailable.');
    }
    foreach (['database.sql', 'database.sqlite', 'database.json', '.mysql-client.cnf'] as $existingFile) {
        if (file_exists($backupPath.'/'.$existingFile)) {
            throw new RuntimeException('The backup destination is not empty.');
        }
    }
    require $backendPath.'/vendor/autoload.php';
    $app = require $backendPath.'/bootstrap/app.php';
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $connection = \Illuminate\Support\Facades\DB::connection();
    $config = $connection->getConfig();
    $driver = (string) ($config['driver'] ?? '');
    $connection->getPdo();

    if ($driver === 'sqlite') {
        $dumpFile = $backupPath.'/database.sqlite';
        $connection->getPdo()->exec('VACUUM INTO '.$connection->getPdo()->quote($dumpFile));
    } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
        $database = (string) ($config['database'] ?? '');
        if (! preg_match('/\A[A-Za-z0-9_][A-Za-z0-9_$-]*\z/', $database)) {
            throw new RuntimeException('Unsupported database identifier.');
        }
        $finder = new \Symfony\Component\Process\ExecutableFinder;
        $executable = $finder->find('mysqldump') ?: $finder->find('mariadb-dump');
        if (! $executable) {
            throw new RuntimeException('A database dump utility is required.');
        }
        $quote = static fn (mixed $value): string => '"'.str_replace(
            ["\\", '"', "\n", "\r"], ["\\\\", '\\"', '\\n', '\\r'], (string) $value
        ).'"';
        $options = ['user' => $config['username'] ?? '', 'password' => $config['password'] ?? ''];
        if (filled($config['unix_socket'] ?? null)) {
            $options['socket'] = $config['unix_socket'];
        } else {
            $options['host'] = $config['host'] ?? '127.0.0.1';
            $options['port'] = $config['port'] ?? 3306;
        }
        $optionFile = $backupPath.'/.mysql-client.cnf';
        $contents = "[client]\n";
        foreach ($options as $key => $value) {
            $contents .= $key.'='.$quote($value)."\n";
        }
        if (file_put_contents($optionFile, $contents, LOCK_EX) !== strlen($contents)) {
            throw new RuntimeException('Could not prepare private database configuration.');
        }
        chmod($optionFile, 0600);
        $dumpFile = $backupPath.'/database.sql';
        $process = proc_open([
            $executable, '--defaults-extra-file='.$optionFile, '--single-transaction', '--routines',
            '--triggers', '--events', '--hex-blob', '--no-tablespaces', '--default-character-set=utf8mb4',
            '--', $database,
        ], [0 => ['pipe', 'r'], 1 => ['file', $dumpFile, 'w'], 2 => ['file', $backupPath.'/dump-error.log', 'w']], $pipes);
        if (! is_resource($process)) {
            throw new RuntimeException('Could not start database backup.');
        }
        fclose($pipes[0]);
        if (proc_close($process) !== 0) {
            throw new RuntimeException('Database backup failed.');
        }
    } else {
        throw new RuntimeException('Unsupported database driver.');
    }

    if (! is_file($dumpFile) || filesize($dumpFile) === 0) {
        throw new RuntimeException('Database backup is empty.');
    }
    chmod($dumpFile, 0600);
    file_put_contents($backupPath.'/database.json', json_encode([
        'driver' => $driver, 'file' => basename($dumpFile), 'sha256' => hash_file('sha256', $dumpFile),
    ], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));
    fwrite(STDOUT, "Database snapshot completed.\n");
} catch (Throwable) {
    if ($dumpFile !== null && is_file($dumpFile)) {
        unlink($dumpFile);
    }
    fwrite(STDERR, "Database snapshot failed; deployment must stop before migrations.\n");
    $exitCode = 1;
} finally {
    if ($optionFile !== null && is_file($optionFile)) {
        unlink($optionFile);
    }
}

exit($exitCode);
