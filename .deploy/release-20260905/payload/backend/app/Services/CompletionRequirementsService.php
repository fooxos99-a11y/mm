<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use App\Services\Concerns\BuildsCompletionStudentRows;
use App\Services\Concerns\FinalizesCompletionBranches;
use App\Services\Concerns\ManagesCompletionSettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompletionRequirementsService
{
    use BuildsCompletionStudentRows;
    use FinalizesCompletionBranches;
    use ManagesCompletionSettings;

    public function branchPayload(string $branchCode): array
    {
        $settings = $this->settings($branchCode);
        $students = Student::query()
            ->whereNull('archive_id')
            ->whereHas('branch', fn ($query) => $query->where('code', $branchCode))
            ->with('branch')
            ->orderBy('full_name')
            ->get();

        $liveRows = $this->buildStudentRows($students, $settings);
        $finalized = DB::table('student_completion_results')
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->keyBy('student_id');

        $rows = $liveRows->map(function (array $row) use ($settings, $finalized): array {
            if (! $settings->is_closed) {
                return $row;
            }

            $snapshot = $finalized->get($row['id']);
            if (! $snapshot) {
                $row['status'] = $row['status'] === 'passed' ? 'passed' : 'failed';

                return $row;
            }

            $details = json_decode((string) $snapshot->details, true);
            $row['status'] = $snapshot->status;
            $row['details'] = is_array($details) ? $details : $row['details'];
            $row['finalizedAt'] = (string) $snapshot->finalized_at;

            return $row;
        })->values();

        return [
            'branchCode' => $branchCode,
            'branchLabel' => $branchCode === 'female' ? 'معلمات' : 'معلمين',
            'settings' => $this->serializeSettings($settings),
            'summary' => [
                'total' => $rows->count(),
                'passed' => $rows->where('status', 'passed')->count(),
                'inProgress' => $rows->where('status', 'in_progress')->count(),
                'failed' => $rows->where('status', 'failed')->count(),
            ],
            'students' => $rows->all(),
        ];
    }

    public function studentPayload(User $user): array
    {
        abort_unless($user->role === 'student', 403, 'هذه البيانات مخصصة للطالب فقط.');

        $student = Student::query()
            ->whereNull('archive_id')
            ->where('login_code', $user->login_code)
            ->with('branch')
            ->firstOrFail();
        $payload = $this->branchPayload((string) $student->branch->code);
        $row = collect($payload['students'])->firstWhere('id', $student->id);

        return [
            'branchCode' => $payload['branchCode'],
            'branchLabel' => $payload['branchLabel'],
            'settings' => $payload['settings'],
            'student' => $row,
        ];
    }

    public function updateSettings(string $branchCode, array $updates): array
    {
        $settings = $this->settings($branchCode);
        if ($settings->is_closed) {
            throw ValidationException::withMessages(['settings' => 'أعد فتح النتائج قبل تعديل المتطلبات.']);
        }

        DB::table('completion_requirement_settings')->where('branch_code', $branchCode)->update([
            'attendance_required' => $updates['attendanceRequired'],
            'tasks_percentage_required' => $updates['tasksPercentageRequired'],
            'final_exam_percentage_required' => $updates['finalExamPercentageRequired'],
            'quran_parts_required' => $updates['quranPartsRequired'],
            'updated_at' => now(),
        ]);

        $this->syncPractitionerPageContent();

        return $this->branchPayload($branchCode);
    }
}
