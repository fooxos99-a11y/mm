<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class AttendanceOpenConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    public function test_competing_course_opens_leave_one_active_session_in_the_department(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('MySQL row locks are required for the parallel opening test.');
        }
        $department = DepartmentContext::id();
        $admin = User::factory()->create(['role' => 'admin']);
        $courses = [(string) str()->uuid(), (string) str()->uuid()];
        foreach ($courses as $course) {
            DB::table('courses')->insert(['id' => $course, 'title' => 'Concurrent course',
                'department_id' => $department, 'created_at' => now()]);
        }
        $config = DB::connection()->getConfig();
        $environment = ['APP_ENV' => 'testing', 'APP_KEY' => config('app.key'), 'DB_CONNECTION' => 'mysql',
            'DB_URL' => '', 'DB_HOST' => $config['host'], 'DB_PORT' => (string) $config['port'],
            'DB_DATABASE' => $config['database'], 'DB_USERNAME' => $config['username'],
            'DB_PASSWORD' => $config['password'], 'DB_SOCKET' => '', 'CACHE_STORE' => 'array',
            'SESSION_DRIVER' => 'array', 'QUEUE_CONNECTION' => 'sync', 'BROADCAST_CONNECTION' => 'null'];
        $barrier = sys_get_temp_dir().'/momars-attendance-open-'.str()->uuid();
        mkdir($barrier, 0700);
        $workers = [];
        try {
            foreach ($courses as $index => $course) {
                $worker = new Process([PHP_BINARY, base_path('tests/Support/open-attendance-worker.php'),
                    $department, $admin->id, $course, $barrier, (string) $index], base_path(), $environment);
                $worker->setTimeout(40)->start();
                $workers[] = $worker;
            }
            $deadline = microtime(true) + 12;
            while (! is_file($barrier.'/ready-0') || ! is_file($barrier.'/ready-1')) {
                $this->assertLessThan($deadline, microtime(true), 'Both workers must reach the start barrier.');
                usleep(10000);
            }
            file_put_contents($barrier.'/go', 'go');
            foreach ($workers as $worker) {
                $worker->wait();
                $this->assertTrue($worker->isSuccessful(), $worker->getErrorOutput());
                $this->assertNotEmpty(json_decode($worker->getOutput(), true, flags: JSON_THROW_ON_ERROR)['id']);
            }
            $sessions = DB::table('attendance_sessions')->where('department_id', $department)->get();
            $this->assertCount(2, $sessions);
            $this->assertCount(1, $sessions->where('active', 1));
            $closed = $sessions->whereNull('active')->sole();
            $this->assertNotNull($closed->closed_at);
        } finally {
            foreach ($workers as $worker) {
                if ($worker->isRunning()) {
                    $worker->stop();
                }
            }
            foreach (['go', 'ready-0', 'ready-1'] as $name) {
                @unlink($barrier.'/'.$name);
            }
            @rmdir($barrier);
        }
    }
}
