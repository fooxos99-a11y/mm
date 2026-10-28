<?php

declare(strict_types=1);

use Illuminate\Database\ConnectionInterface;

function attendanceAccountingReport(ConnectionInterface $connection, ?array $departmentIds = null): array
{
    $departments = $connection->table('departments');
    $departmentIds === null ? $departments->where('name', 'like', '%ممارس%') : $departments->whereIn('id', $departmentIds);
    $report = [];
    foreach ($departments->get(['id', 'name']) as $department) {
        $report = [...$report, ...App\Support\DepartmentContext::run($department->id, function () use ($connection, $department): array {
            $courses = $connection->table('courses')->where('department_id', $department->id)->whereNull('archive_id')->get();
            $records = $connection->table('course_attendance')->where('department_id', $department->id)->whereNull('archive_id')->get();
            $checks = [];
            foreach (['male', 'female'] as $branch) {
                $completion = app(App\Services\CompletionRequirementsService::class)->branchPayload($branch);
                $students = collect($completion['students']);
                foreach ($courses->where('entity_type', '!=', 'task') as $course) {
                    $attendees = $records->where('course_id', $course->id)->pluck('login_code')->unique();
                    $rows = $students->whereIn('loginCode', $attendees);
                    if ($rows->isEmpty()) {
                        continue;
                    }
                    $results = app(App\Services\ResultsDirectoryService::class)->paginate(new App\Models\User(['role' => 'admin']), [
                        'branchCode' => $branch, 'assessmentType' => 'attendance', 'courseId' => $course->id,
                    ]);
                    $credited = $rows->filter(function ($row) use ($records): bool {
                        $expected = $records->where('login_code', $row['loginCode'])->pluck('course_id')->unique()->count();

                        return $row['details']['attendance']['current'] === $expected;
                    })->count();
                    $checks[] = ['department' => $department->name, 'course' => $course->title, 'branch' => $branch,
                        'present' => $rows->count(), 'resultsPresent' => $results['summary']['present'],
                        'creditedInCompletion' => $credited, 'completionFinalized' => $completion['settings']['isClosed'],
                        'verified' => $results['summary']['present'] === $rows->count() && $credited === $rows->count()];
                }
            }

            return $checks;
        })];
    }

    return $report;
}

function attendancePreservationSnapshot(ConnectionInterface $connection): array
{
    return $connection->transaction(function () use ($connection): array {
        $records = [];
        $courses = [];
        $rows = $connection->table('course_attendance')->orderBy('id')->get([
            'id', 'department_id', 'course_id', 'student_id', 'student_name', 'login_code',
            'source', 'session_id', 'hours', 'created_at', 'archive_id',
        ]);
        foreach ($rows as $row) {
            // Only fingerprints leave this process; names and login codes are never output.
            $records[$row->id] = hash('sha256', json_encode((array) $row, JSON_THROW_ON_ERROR));
        }
        foreach ($connection->table('courses')->join('departments', 'departments.id', '=', 'courses.department_id')
            ->whereNull('courses.archive_id')->get(['courses.id', 'courses.title', 'departments.name']) as $course) {
            $attendance = $rows->where('course_id', $course->id)->whereNull('archive_id');
            if ($attendance->isEmpty()) {
                continue;
            }
            $courses[] = ['department' => $course->name, 'course' => $course->title,
                'records' => $attendance->count(), 'present' => $attendance->unique('login_code')->count(),
                'legacyRecords' => $attendance->whereNull('session_id')->count()];
        }

        return ['records' => $records, 'courses' => $courses, 'accounting' => attendanceAccountingReport($connection)];
    });
}

function compareAttendancePreservation(array $before, array $after): array
{
    if (! isset($before['records'], $after['records']) || ! is_array($before['records']) || ! is_array($after['records'])) {
        throw new RuntimeException('Attendance snapshots are invalid.');
    }
    foreach ($before['records'] as $id => $fingerprint) {
        if (($after['records'][$id] ?? null) !== $fingerprint) {
            throw new RuntimeException('Existing attendance records changed or disappeared; activation stopped.');
        }
    }

    return ['preserved' => true, 'beforeRecords' => count($before['records']),
        'afterRecords' => count($after['records']), 'courses' => $after['courses'] ?? [], 'accounting' => $after['accounting'] ?? []];
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    try {
        if (($argv[1] ?? '') === 'snapshot' && $argc === 3) {
            $backend = realpath($argv[2]);
            if ($backend === false || ! is_file($backend.'/vendor/autoload.php')) {
                throw new RuntimeException('Backend path is unavailable.');
            }
            require $backend.'/vendor/autoload.php';
            $app = require $backend.'/bootstrap/app.php';
            $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
            $result = attendancePreservationSnapshot(Illuminate\Support\Facades\DB::connection());
        } elseif (($argv[1] ?? '') === 'compare' && $argc === 4) {
            $result = compareAttendancePreservation(
                json_decode(file_get_contents($argv[2]), true, flags: JSON_THROW_ON_ERROR),
                json_decode(file_get_contents($argv[3]), true, flags: JSON_THROW_ON_ERROR),
            );
        } else {
            throw new RuntimeException('Usage: audit-attendance-preservation.php snapshot <backend> | compare <before> <after>');
        }
        echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT).PHP_EOL;
    } catch (Throwable $exception) {
        // Do not include connection details or record identities in deployment logs.
        fwrite(STDERR, 'Attendance preservation audit failed: '.(get_class($exception) === RuntimeException::class ? $exception->getMessage() : 'Snapshot unavailable.').PHP_EOL);
        exit(1);
    }
}
