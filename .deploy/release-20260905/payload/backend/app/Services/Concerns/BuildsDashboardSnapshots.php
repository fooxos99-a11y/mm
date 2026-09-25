<?php

namespace App\Services\Concerns;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\TrainingMaterial;
use Illuminate\Support\Collection;

trait BuildsDashboardSnapshots
{
    use NormalizesDashboardSnapshotAnswers;
    use SerializesDashboardSnapshots;

    public function loadDashboardSnapshot(bool $includeAll = false, int $page = 1): array
    {
        $currentUser = auth('sanctum')->user() ?: auth()->user();
        $currentRole = (string) ($currentUser?->role ?? '');
        $currentLoginCode = trim((string) ($currentUser?->login_code ?? ''));
        $managedBranchId = $this->resolveManagedDashboardBranchId($currentRole);
        [$students, $reciters] = $this->dashboardSnapshotPeopleLoader->load(
            $currentRole,
            $currentLoginCode,
            $managedBranchId,
        );
        $allowedStudentLogins = $students
            ->pluck('login_code')
            ->map(fn ($loginCode): string => trim((string) $loginCode))
            ->filter()
            ->unique()
            ->values();
        $allowedBranchCodes = $students
            ->map(fn (Student $student): string => (string) ($student->branch?->code ?? ''))
            ->filter()
            ->unique()
            ->values();
        $visibleBranchCodes = $managedBranchId !== ''
            ? collect([$managedBranchId])
            : $allowedBranchCodes;
        $restrictStudentData = $currentRole !== 'admin';

        [
            'courses' => $courses,
            'questions' => $questions,
            'submissions' => $submissions,
            'submissionAnswers' => $submissionAnswers,
            'attendance' => $attendance,
            'taskTemplates' => $taskTemplates,
            'meta' => $courseSnapshotMeta,
        ] = $this->dashboardSnapshotCourseLoader->load($restrictStudentData, $allowedStudentLogins, $includeAll, $page);
        [
            'satisfactionQuestions' => $satisfactionQuestions,
            'satisfactionResponses' => $satisfactionResponses,
            'finalExamQuestions' => $finalExamQuestions,
            'finalExamSubmissions' => $finalExamSubmissions,
            'finalExamAnswers' => $finalExamAnswers,
            'finalExamSettings' => $finalExamSettings,
            'meta' => $feedbackSnapshotMeta,
        ] = $this->dashboardSnapshotFeedbackLoader->load(
            $restrictStudentData,
            $allowedStudentLogins,
            $visibleBranchCodes,
            $includeAll,
            $page,
        );
        [
            'branches' => $branches,
            'rolePermissions' => $rolePermissions,
            'trainingMaterials' => $trainingMaterials,
        ] = $this->dashboardSnapshotReferenceLoader->load(
            $managedBranchId,
            $restrictStudentData,
            $visibleBranchCodes,
        );
        $notifications = collect($this->loadNotifications($includeAll));
        $currentRolePermissions = $rolePermissions
            ->where('role', $currentRole)
            ->pluck('is_enabled', 'permission_key');
        $canViewCourseAnswerKeys = $currentRole === 'admin'
            || (in_array($currentRole, ['male_manager', 'female_manager'], true)
                && collect(['edit_pre_questions', 'edit_post_questions', 'edit_tasks'])
                    ->contains(fn (string $permission): bool => (bool) ($currentRolePermissions[$permission] ?? false)));
        $canViewFinalExamAnswerKeys = $currentRole === 'admin'
            || (in_array($currentRole, ['male_manager', 'female_manager'], true)
                && (bool) ($currentRolePermissions['page_final_exam'] ?? false));

        if ($managedBranchId !== '') {
            $students = $students->filter(fn (Student $student) => ($student->branch?->code ?? 'male') === $managedBranchId)->values();
            $reciters = $reciters->filter(fn (Reciter $reciter) => ($reciter->branch?->code ?? 'male') === $managedBranchId)->values();

            $allowedStudentLogins = $students
                ->map(fn (Student $student) => (string) $student->login_code)
                ->filter(fn (string $loginCode) => $loginCode !== '')
                ->flip();

            $submissions = $submissions->filter(fn ($submission) => $allowedStudentLogins->has((string) $submission->login_code))->values();
            $attendance = $attendance->filter(fn ($item) => $allowedStudentLogins->has((string) $item->login_code))->values();
            $satisfactionResponses = $satisfactionResponses->filter(fn ($item) => $allowedStudentLogins->has((string) $item->login_code))->values();
            $finalExamQuestions = $finalExamQuestions->filter(fn ($item) => (string) $item->branch_code === $managedBranchId)->values();
            $finalExamSubmissions = $finalExamSubmissions->filter(fn ($item) => (string) $item->branch_code === $managedBranchId)->values();
            $trainingMaterials = $trainingMaterials
                ->filter(fn (TrainingMaterial $material) => ! $material->target_branch_code
                    || $material->target_branch_code === $managedBranchId
                    || $material->target_branch_code === 'supervision')
                ->values();
            $notifications = $notifications
                ->filter(fn (array $item) => ! ($item['targetBranchId'] ?? null) || ($item['targetBranchId'] ?? null) === $managedBranchId)
                ->values();
        }

        if (! in_array($currentRole, ['admin', 'male_manager', 'female_manager'], true)) {
            if (in_array($currentRole, ['student', 'trainee'], true)) {
                $students = $students
                    ->filter(fn (Student $student) => (string) $student->login_code === $currentLoginCode)
                    ->values();
                $reciters = collect();
            } elseif ($currentRole === 'reciter') {
                $currentReciter = $reciters->first(
                    fn (Reciter $reciter) => (string) ($reciter->user?->login_code ?? '') === $currentLoginCode,
                );
                $students = $currentReciter
                    ? $currentReciter->students->loadMissing(['branch', 'parts'])->values()
                    : collect();
                $reciters = $currentReciter ? collect([$currentReciter]) : collect();
            } else {
                $students = collect();
                $reciters = collect();
            }

            $allowedStudentLogins = $students
                ->map(fn (Student $student) => (string) $student->login_code)
                ->filter(fn (string $loginCode) => $loginCode !== '')
                ->flip();
            $allowedBranchCodes = $students
                ->map(fn (Student $student) => (string) ($student->branch?->code ?? ''))
                ->filter()
                ->unique()
                ->flip();

            $submissions = $submissions->filter(fn ($submission) => $allowedStudentLogins->has((string) $submission->login_code))->values();
            $attendance = $attendance->filter(fn ($item) => $allowedStudentLogins->has((string) $item->login_code))->values();
            $satisfactionResponses = $satisfactionResponses->filter(fn ($item) => $allowedStudentLogins->has((string) $item->login_code))->values();
            $finalExamQuestions = $finalExamQuestions->filter(fn ($item) => $allowedBranchCodes->has((string) $item->branch_code))->values();
            $finalExamSubmissions = $finalExamSubmissions->filter(fn ($item) => $allowedStudentLogins->has((string) $item->login_code))->values();
            $notifications = collect();
            $rolePermissions = collect();

            $studentBranchCode = $students->first()?->branch?->code;

            $trainingMaterials = $trainingMaterials
                ->filter(fn (TrainingMaterial $material) => $material->target_branch_code !== 'supervision'
                    && (! $material->target_branch_code || $material->target_branch_code === $studentBranchCode))
                ->values();
        }

        $courseQuestionsById = $questions->flatten(1)->keyBy('id');
        $finalQuestionsById = collect($finalExamQuestions)->keyBy('id');
        $questionsByCourse = $questions->map(fn (Collection $items) => [
            'pre' => $this->normalizeCourseQuestions($items->where('assessment_type', 'pre'), $canViewCourseAnswerKeys),
            'post' => $this->normalizeCourseQuestions($items->where('assessment_type', 'post'), $canViewCourseAnswerKeys),
            'tasks' => $this->normalizeCourseQuestions($items->where('assessment_type', 'tasks'), $canViewCourseAnswerKeys),
        ]);

        return [
            'snapshotMeta' => [...$courseSnapshotMeta, ...$feedbackSnapshotMeta],
            ...$this->serializeDashboardPeople($managedBranchId, $branches, $students, $reciters),
            ...$this->serializeDashboardCourses(
                $courses,
                $questionsByCourse,
                $taskTemplates,
                $submissions,
                $submissionAnswers,
                $courseQuestionsById,
                $canViewCourseAnswerKeys,
                $attendance,
                $notifications,
            ),
            ...$this->serializeDashboardFeedback(
                $satisfactionQuestions,
                $satisfactionResponses,
                $finalExamQuestions,
                $finalExamSubmissions,
                $finalExamAnswers,
                $finalQuestionsById,
                $canViewFinalExamAnswerKeys,
                $finalExamSettings,
                $managedBranchId,
            ),
            ...$this->serializeDashboardReferences($trainingMaterials, $rolePermissions),
        ];
    }

    private function resolveManagedDashboardBranchId(?string $role): string
    {
        return match ($role) {
            'male_manager' => 'male',
            'female_manager' => 'female',
            default => '',
        };
    }
}
