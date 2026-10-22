<?php

namespace App\Console\Commands;

use App\Models\Department;
use App\Models\User;
use App\Services\StudentImportService;
use App\Support\DepartmentContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Throwable;

final class ImportStudents extends Command
{
    protected $signature = 'students:import {file?} {--inspect} {--department=} {--department-name=}
        {--apply} {--verify=} {--expected-count=} {--expected-students=}';

    protected $description = 'Inspect departments, preview or atomically import a private student batch';

    public function handle(StudentImportService $service): int
    {
        try {
            if ($this->option('inspect')) {
                $rows = DB::table('departments')->get(['id', 'name', 'is_active'])->map(function ($row): array {
                    return [...(array) $row, 'students' => DB::table('students')->where('department_id', $row->id)
                        ->whereNull('archive_id')->count(), 'accounts' => DB::table('users')->where('department_id', $row->id)->count()];
                });
                $this->line($rows->toJson(JSON_UNESCAPED_UNICODE));

                return self::SUCCESS;
            }
            $department = Department::query()->whereKey((string) $this->option('department'))
                ->where('name', (string) $this->option('department-name'))->where('is_active', true)->first();
            if (! $department) {
                $this->error('Exact active department ID and name are required. No data changed.');

                return self::FAILURE;
            }

            return DepartmentContext::run($department->id, function () use ($service): int {
                if ($batchId = $this->option('verify')) {
                    return $this->verify((string) $batchId);
                }
                $data = json_decode(file_get_contents($this->argument('file')), true, 512, JSON_THROW_ON_ERROR);
                $preview = $service->preview($data);
                if ((int) $this->option('expected-count') !== $preview['count']) {
                    $this->error('Unexpected source count. No data changed.');

                    return self::FAILURE;
                }
                $currentCount = DB::table('students')->where('department_id', DepartmentContext::id())->whereNull('archive_id')->count();
                if ($this->option('apply') && ! $preview['alreadyImported']
                    && (string) $currentCount !== (string) $this->option('expected-students')) {
                    $this->error('Department student count changed. Preview again. No data changed.');

                    return self::FAILURE;
                }
                $result = $this->option('apply') ? $service->import($data, $preview['confirmation']) : $preview;
                $this->line(json_encode([
                    'departmentId' => $result['departmentId'], 'departmentName' => $result['departmentName'],
                    'count' => $result['count'], 'studentsBefore' => $currentCount, 'batchId' => $result['batchId'],
                    'alreadyImported' => $result['alreadyImported'], 'imported' => $result['imported'] ?? 0,
                    'conflicts' => $result['conflicts'], 'warnings' => $result['warnings'],
                    'firstCode' => $result['rows'][0]['loginCode'], 'lastCode' => end($result['rows'])['loginCode'],
                ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

                return $result['conflicts'] === [] ? self::SUCCESS : self::FAILURE;
            });
        } catch (ValidationException $exception) {
            $this->error(json_encode($exception->errors(), JSON_UNESCAPED_UNICODE));

            return self::FAILURE;
        } catch (Throwable $exception) {
            // Never print submitted records, credentials, connection strings or SQL exception bindings.
            $this->error('Import stopped safely: '.class_basename($exception));

            return self::FAILURE;
        }
    }

    private function verify(string $batchId): int
    {
        $batch = DB::table('student_import_batches')->where('id', $batchId)->where('department_id', DepartmentContext::id())->first();
        abort_unless($batch, 404);
        $items = DB::table('student_import_items')->where('batch_id', $batchId)->get();
        $valid = 0;
        foreach ($items as $item) {
            $user = User::query()->where('department_id', DepartmentContext::id())->find($item->user_id);
            $student = DB::table('students')->where('department_id', DepartmentContext::id())->find($item->student_id);
            $registration = DB::table('registration_requests')->where('department_id', DepartmentContext::id())->find($item->registration_id);
            if ($user && $student && $registration && $user->login_code === $student->login_code
                && $user->full_name === $student->full_name && Hash::check($user->login_code, $user->password)
                && $registration->student_id === $student->id && ! $student->is_certified) {
                $valid++;
            }
        }
        $this->line(json_encode(['batchId' => $batchId, 'expected' => $batch->record_count, 'verified' => $valid]));

        return $valid === $batch->record_count ? self::SUCCESS : self::FAILURE;
    }
}
