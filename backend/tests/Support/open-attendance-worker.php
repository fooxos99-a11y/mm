<?php

use App\Models\User;
use App\Services\AttendanceSessionService;
use App\Support\DepartmentContext;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || DB::getDriverName() !== 'mysql') {
    throw new LogicException('Attendance workers require the isolated MySQL test environment.');
}
[$script, $department, $userId, $course, $barrier, $worker] = $argv;
file_put_contents($barrier.'/ready-'.$worker, 'ready');
$deadline = microtime(true) + 15;
while (! is_file($barrier.'/go')) {
    if (microtime(true) > $deadline) {
        throw new RuntimeException('Attendance concurrency start barrier timed out.');
    }
    usleep(10000);
}
DB::listen(static function ($query): void {
    if (str_starts_with($query->sql, 'select') && str_contains($query->sql, 'courses')) {
        usleep(200000);
    }
});
$session = DepartmentContext::run($department, fn () => app(AttendanceSessionService::class)
    ->open(User::query()->findOrFail($userId), $course, 1));
echo json_encode(['id' => $session['id']]);
