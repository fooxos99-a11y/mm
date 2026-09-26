<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AssessmentAccessService
{
    public function prepareCourseSubmission(?User $user, bool $publicRoute, array $data): array
    {
        if (! $this->requiresStudentIdentity($user, $publicRoute)) {
            return $data;
        }

        $student = $this->authenticatedStudent($user, $data['loginId'], 'loginId');
        $data['studentName'] = $student->full_name;

        return $data;
    }

    public function prepareSatisfactionResponses(?User $user, bool $publicRoute, array $responses): array
    {
        if (! $this->requiresStudentIdentity($user, $publicRoute)) {
            return $responses;
        }

        $loginCodes = collect($responses)
            ->pluck('loginCode')
            ->map(fn ($loginCode) => trim((string) $loginCode))
            ->filter()
            ->unique()
            ->values();

        if ($loginCodes->count() !== 1) {
            throw ValidationException::withMessages([
                'responses' => ['لا يمكن إرسال رضا لأكثر من حساب في الطلب نفسه.'],
            ]);
        }

        $student = $this->authenticatedStudent($user, (string) $loginCodes->first());

        return collect($responses)
            ->map(fn (array $response): array => [
                ...$response,
                'studentName' => $student->full_name,
            ])
            ->all();
    }

    public function prepareFinalExamSubmission(?User $user, bool $publicRoute, array $data): array
    {
        if (! $this->requiresStudentIdentity($user, $publicRoute)) {
            return $data;
        }

        $student = $this->authenticatedStudent($user, $data['loginCode']);
        $data['studentName'] = $student->full_name;
        $data['branchCode'] = (string) $student->branch?->code;

        return $data;
    }

    public function assertCanManageSubmissionBranch(?User $user, string $submissionId, bool $finalExam = false): void
    {
        $role = (string) ($user?->role ?? '');
        if ($role === 'admin') {
            return;
        }

        $managedBranch = $this->managedBranch($role);
        if ($managedBranch === '') {
            abort(Response::HTTP_FORBIDDEN, 'غير مصرح لك بمراجعة هذه النتيجة.');
        }

        $submissionBranch = $finalExam
            ? (string) DB::table('final_exam_submissions')->where('id', $submissionId)->value('branch_code')
            : $this->courseSubmissionBranch($submissionId);

        if ($submissionBranch !== $managedBranch) {
            abort(Response::HTTP_FORBIDDEN, 'هذه النتيجة لا تتبع فرعك.');
        }
    }

    private function requiresStudentIdentity(?User $user, bool $publicRoute): bool
    {
        return $publicRoute || in_array((string) ($user?->role ?? ''), ['student', 'trainee'], true);
    }

    private function authenticatedStudent(?User $user, string $loginCode, string $field = 'loginCode'): Student
    {
        $userLoginCode = trim((string) ($user?->login_code ?? ''));
        $targetLoginCode = trim($loginCode);

        if (
            ! $user
                || ! in_array((string) $user->role, ['student', 'trainee'], true)
                || $userLoginCode === ''
                || $userLoginCode !== $targetLoginCode
        ) {
            throw ValidationException::withMessages([
                $field => ['هذا الإرسال متاح فقط لصاحب الحساب المسجل.'],
            ]);
        }

        $student = Student::query()
            ->with('branch')
            ->whereNull('archive_id')
            ->where('login_code', $targetLoginCode)
            ->first();

        if (! $student || ! in_array((string) $student->branch?->code, ['male', 'female'], true)) {
            throw ValidationException::withMessages([
                $field => ['تعذر التحقق من ملف الطالب المرتبط بهذا الحساب.'],
            ]);
        }

        return $student;
    }

    private function courseSubmissionBranch(string $submissionId): string
    {
        $submission = DB::table('course_submissions')
            ->where('id', $submissionId)
            ->first(['student_id', 'login_code']);

        if (! $submission) {
            return '';
        }

        return (string) Student::query()
            ->where(fn ($query) => $query
                ->whereKey($submission->student_id)
                ->orWhere('login_code', $submission->login_code))
            ->join('branches', 'branches.id', '=', 'students.branch_id')
            ->value('branches.code');
    }

    private function managedBranch(string $role): string
    {
        return match ($role) {
            'female_manager' => 'female',
            'male_manager' => 'male',
            default => '',
        };
    }
}
