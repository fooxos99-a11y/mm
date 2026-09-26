<?php

namespace App\Services\Concerns;

use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait FinalizesCompletionBranches
{
    public function closeBranch(string $branchCode, string $userId): array
    {
        $settings = $this->settings($branchCode);
        if ($settings->is_closed) {
            return $this->branchPayload($branchCode);
        }

        $payload = $this->branchPayload($branchCode);

        DB::transaction(function () use ($branchCode, $userId, $payload): void {
            $studentIds = collect($payload['students'])->pluck('id');
            $existingIds = DB::table('student_completion_results')
                ->whereIn('student_id', $studentIds)
                ->pluck('id', 'student_id');
            $timestamp = now();
            $requirements = json_encode($payload['settings'], JSON_UNESCAPED_UNICODE);

            $results = collect($payload['students'])
                ->map(fn (array $row): array => [
                    'id' => $existingIds->get($row['id']) ?: (string) Str::uuid(),
                    'student_id' => $row['id'],
                    'branch_code' => $branchCode,
                    'status' => $row['status'] === 'passed' ? 'passed' : 'failed',
                    'requirements_snapshot' => $requirements,
                    'details' => json_encode($row['details'], JSON_UNESCAPED_UNICODE),
                    'finalized_by' => $userId,
                    'finalized_at' => $timestamp,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ])
                ->all();

            if ($results !== []) {
                DB::table('student_completion_results')->upsert(
                    $results,
                    ['student_id'],
                    [
                        'branch_code',
                        'status',
                        'requirements_snapshot',
                        'details',
                        'finalized_by',
                        'finalized_at',
                        'updated_at',
                    ],
                );
            }

            DB::table('completion_requirement_settings')->where('branch_code', $branchCode)->update([
                'is_closed' => true,
                'closed_by' => $userId,
                'closed_at' => now(),
                'updated_at' => now(),
            ]);
        });

        return $this->branchPayload($branchCode);
    }

    public function reopenBranch(string $branchCode): array
    {
        $studentIds = Student::query()
            ->whereNull('archive_id')
            ->whereHas('branch', fn ($query) => $query->where('code', $branchCode))
            ->pluck('id');

        DB::transaction(function () use ($branchCode, $studentIds): void {
            DB::table('student_completion_results')->whereIn('student_id', $studentIds)->delete();
            DB::table('completion_requirement_settings')->where('branch_code', $branchCode)->update([
                'is_closed' => false,
                'closed_by' => null,
                'closed_at' => null,
                'updated_at' => now(),
            ]);
        });

        return $this->branchPayload($branchCode);
    }
}
