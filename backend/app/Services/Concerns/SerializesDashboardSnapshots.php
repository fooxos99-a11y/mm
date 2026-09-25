<?php

namespace App\Services\Concerns;

use App\Models\Branch;
use App\Models\Reciter;
use App\Models\Student;
use App\Models\TrainingMaterial;
use Illuminate\Support\Collection;

trait SerializesDashboardSnapshots
{
    private function serializeDashboardPeople(
        string $managedBranchId,
        $branches,
        $students,
        $reciters,
    ): array {
        return [
            'roles' => [
                ['id' => 'admin', 'label' => 'مدير النمو المهني'],
                ['id' => 'male_manager', 'label' => 'مشرف'],
                ['id' => 'female_manager', 'label' => 'مشرفة'],
                ['id' => 'student', 'label' => 'معلم/ة'],
                ['id' => 'reciter', 'label' => 'مقرئ'],
                ['id' => 'trainee', 'label' => 'معلم'],
            ],
            'branches' => $branches
                ->filter(fn (Branch $branch) => $managedBranchId === '' || $branch->code === $managedBranchId)
                ->map(fn (Branch $branch) => [
                    'id' => $branch->code,
                    'label' => $branch->name,
                ])->values()->all(),
            'students' => $students->map(fn (Student $student) => [
                'id' => $student->id,
                'name' => $student->full_name,
                'loginId' => $student->login_code,
                'branchId' => $student->branch?->code ?? 'male',
                'note' => $student->note,
                'isCertified' => $student->is_certified,
                'completedParts' => $student->parts->pluck('part_number')->sort()->values()->all(),
                'createdAt' => optional($student->created_at)->toISOString() ?? now()->toISOString(),
                'registrationProfile' => $this->registrationService->serializeStudentRegistrationProfile($student->registrationRequest),
            ])->values()->all(),
            'reciters' => $reciters->map(fn (Reciter $reciter) => [
                'id' => $reciter->id,
                'name' => $reciter->full_name ?: ($reciter->user?->full_name ?? ''),
                'loginCode' => $reciter->user?->login_code ?? '',
                'branchId' => $reciter->branch?->code ?? 'male',
                'studentIds' => $reciter->students->pluck('id')->values()->all(),
            ])->values()->all(),
        ];
    }

    private function serializeDashboardCourses(
        $courses,
        $questionsByCourse,
        $taskTemplates,
        $submissions,
        $submissionAnswers,
        $courseQuestionsById,
        bool $canViewCourseAnswerKeys,
        $attendance,
        Collection $notifications,
    ): array {
        return [
            'courses' => collect($courses)->map(function ($course) use ($questionsByCourse) {
                $courseQuestions = $questionsByCourse->get($course->id, ['pre' => [], 'post' => [], 'tasks' => []]);

                return [
                    'id' => $course->id,
                    'title' => $course->title,
                    'entityType' => $course->entity_type === 'task' ? 'task' : 'course',
                    'isActive' => (bool) $course->is_active,
                    'isPreEnabled' => (bool) $course->is_pre_enabled,
                    'isPostEnabled' => (bool) $course->is_post_enabled,
                    'isTasksEnabled' => (bool) $course->is_tasks_enabled,
                    'branchAvailability' => [
                        'male' => [
                            'pre' => (bool) $course->male_pre_enabled,
                            'post' => (bool) $course->male_post_enabled,
                            'tasks' => (bool) $course->male_tasks_enabled,
                        ],
                        'female' => [
                            'pre' => (bool) $course->female_pre_enabled,
                            'post' => (bool) $course->female_post_enabled,
                            'tasks' => (bool) $course->female_tasks_enabled,
                        ],
                    ],
                    'assessmentWindows' => $this->decodeJsonObject($course->assessment_windows, ['global' => [], 'male' => [], 'female' => []]),
                    'assessmentNotificationTemplates' => $this->decodeJsonObject($course->assessment_notification_templates, ['pre' => '', 'post' => '', 'tasks' => '']),
                    'taskMode' => $course->task_mode,
                    'taskTemplateId' => $course->task_template_id ?? '',
                    'taskTemplateName' => $course->task_template_name ?? '',
                    'taskTemplateContent' => $course->task_template_content ?? '',
                    'youtubeUrl' => $course->youtube_url ?? '',
                    'taskDescription' => $course->task_description ?? '',
                    'sortOrder' => (int) $course->sort_order,
                    'preQuestions' => $courseQuestions['pre'],
                    'postQuestions' => $courseQuestions['post'],
                    'taskQuestions' => $courseQuestions['tasks'],
                    'createdAt' => (string) $course->created_at,
                ];
            })->values()->all(),
            'taskTemplates' => collect($taskTemplates)->map(fn ($template) => [
                'id' => $template->id,
                'name' => $template->name,
                'content' => $template->content ?? '',
                'createdAt' => (string) $template->created_at,
            ])->values()->all(),
            'submissions' => collect($submissions)->map(function ($submission) use ($submissionAnswers, $courseQuestionsById, $canViewCourseAnswerKeys) {
                return [
                    'id' => $submission->id,
                    'courseId' => $submission->course_id,
                    'assessmentType' => $submission->assessment_type,
                    'studentName' => $submission->student_name,
                    'loginId' => $submission->login_code,
                    'manualScore' => $submission->manual_score !== null ? (float) $submission->manual_score : null,
                    'taskReviewStatus' => $submission->assessment_type === 'tasks' ? ($submission->task_review_status ?: 'pending') : null,
                    'taskReviewedAt' => $submission->task_reviewed_at ? (string) $submission->task_reviewed_at : null,
                    'answers' => collect($submissionAnswers->get($submission->id, []))
                        ->map(fn ($answer) => $this->normalizeSubmissionAnswer(
                            $answer,
                            $courseQuestionsById->get($answer->question_id),
                            $canViewCourseAnswerKeys,
                        ))
                        ->values()
                        ->all(),
                    'submittedAt' => (string) $submission->submitted_at,
                ];
            })->values()->all(),
            'attendance' => collect($attendance)->map(fn ($item) => [
                'id' => $item->id,
                'courseId' => $item->course_id,
                'studentName' => $item->student_name,
                'loginId' => $item->login_code,
                'source' => $item->source === 'manual' ? 'manual' : 'post-test',
                'createdAt' => (string) $item->created_at,
            ])->values()->all(),
            'notifications' => $notifications->values()->all(),
        ];
    }

    private function serializeDashboardFeedback(
        $satisfactionQuestions,
        $satisfactionResponses,
        $finalExamQuestions,
        $finalExamSubmissions,
        $finalExamAnswers,
        $finalQuestionsById,
        bool $canViewFinalExamAnswerKeys,
        $finalExamSettings,
        string $managedBranchId,
    ): array {
        return [
            'satisfactionQuestions' => collect($satisfactionQuestions)->map(fn ($item) => [
                'id' => $item->id,
                'courseId' => $item->course_id ?? '',
                'prompt' => $item->prompt,
                'type' => $item->type === 'text' ? 'text' : 'rating',
                'isRequired' => (bool) $item->is_required,
                'sortOrder' => (int) $item->sort_order,
                'createdAt' => (string) $item->created_at,
            ])->values()->all(),
            'satisfactionResponses' => collect($satisfactionResponses)->map(fn ($item) => [
                'id' => $item->id,
                'courseId' => $item->course_id,
                'questionId' => $item->question_id,
                'loginCode' => $item->login_code,
                'studentName' => $item->student_name,
                'ratingValue' => $item->rating_value !== null ? (int) $item->rating_value : null,
                'textValue' => $item->text_value ?? '',
                'submittedAt' => (string) $item->submitted_at,
            ])->values()->all(),
            'finalExamQuestions' => collect($finalExamQuestions)->map(fn ($item) => [
                'id' => $item->id,
                'branchCode' => $item->branch_code,
                'type' => $this->mapQuestionType($item->question_type, $item->options),
                'prompt' => $item->prompt,
                'options' => $this->decodeJsonArray($item->options),
                'allowFile' => (bool) $item->allow_file,
                'points' => (int) $item->points,
                'correctAnswer' => $canViewFinalExamAnswerKeys ? ($item->correct_answer ?? '') : '',
                'attachmentName' => $item->attachment_name ?? '',
                'attachmentType' => $item->attachment_type ?? '',
                'attachmentDataUrl' => $this->assessmentAttachmentService->temporaryUrl(
                    $item->attachment_path ?? null,
                    $item->attachment_data_url ?? null,
                ),
                'sortOrder' => (int) $item->sort_order,
                'createdAt' => (string) $item->created_at,
            ])->values()->all(),
            'finalExamSubmissions' => collect($finalExamSubmissions)->map(function ($item) use ($finalExamAnswers, $finalQuestionsById, $canViewFinalExamAnswerKeys) {
                return [
                    'id' => $item->id,
                    'branchCode' => $item->branch_code,
                    'studentName' => $item->student_name,
                    'loginCode' => $item->login_code,
                    'manualScore' => $item->manual_score !== null ? (float) $item->manual_score : null,
                    'answers' => collect($finalExamAnswers->get($item->id, []))
                        ->map(fn ($answer) => $this->normalizeSubmissionAnswer(
                            $answer,
                            $finalQuestionsById->get($answer->question_id),
                            $canViewFinalExamAnswerKeys,
                        ))
                        ->values()
                        ->all(),
                    'submittedAt' => (string) $item->submitted_at,
                ];
            })->values()->all(),
            'finalExamSettings' => [
                'male' => $managedBranchId !== '' && $managedBranchId !== 'male'
                    ? ['isEnabled' => false, 'closesAt' => null, 'notificationTemplate' => '']
                    : $this->normalizeFinalExamSetting($finalExamSettings->get('male')),
                'female' => $managedBranchId !== '' && $managedBranchId !== 'female'
                    ? ['isEnabled' => false, 'closesAt' => null, 'notificationTemplate' => '']
                    : $this->normalizeFinalExamSetting($finalExamSettings->get('female')),
            ],
        ];
    }

    private function serializeDashboardReferences($trainingMaterials, $rolePermissions): array
    {
        return [
            'trainingMaterials' => $trainingMaterials
                ->map(fn (TrainingMaterial $material) => $this->trainingMaterialService->serialize($material))
                ->values()
                ->all(),
            'homePageContent' => $this->pageContentService->loadHomePageContent(),
            'practitionerPageContent' => $this->pageContentService->loadPractitionerPageContent(),
            'rolePermissions' => $rolePermissions
                ->groupBy('role')
                ->map(fn (Collection $items) => $items->mapWithKeys(fn ($item) => [$item->permission_key => (bool) $item->is_enabled])->all())
                ->all(),
        ];
    }
}
