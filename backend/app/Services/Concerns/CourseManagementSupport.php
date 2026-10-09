<?php

namespace App\Services\Concerns;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

trait CourseManagementSupport
{
    use MapsQuestionTypes;

    private function dispatchAssessmentOpenNotification(
        ?object $course,
        string $assessmentType,
        array $templates,
        array $windows
    ): void {
        if (! $course || ! in_array($assessmentType, ['pre', 'post', 'tasks'], true)) {
            return;
        }

        $template = trim((string) ($templates[$assessmentType] ?? ''));

        if ($template === '') {
            return;
        }

        $targetBranches = $this->resolveAssessmentTargetBranches($course, $assessmentType, $windows);

        foreach ($targetBranches as $branchCode) {
            $message = $this->fillTemplatePlaceholders($template, [
                'courseTitle' => (string) ($course->title ?? ''),
                'assessmentLabel' => $this->assessmentLabel($assessmentType),
                'branchLabel' => $this->branchLabel($branchCode),
                'durationMinutes' => (string) $this->resolveAssessmentDurationMinutes(
                    $windows,
                    $assessmentType,
                    $branchCode
                ),
            ]);

            if (trim($message) === '') {
                continue;
            }

            $this->dashboardCommunicationService->addNotification([
                'title' => sprintf('%s - %s', $this->assessmentLabel($assessmentType), (string) ($course->title ?? '')),
                'message' => $message,
                'targetBranchId' => $branchCode,
                'createdByName' => 'النظام',
                'createdByRole' => 'system',
            ]);
        }
    }

    private function dispatchFinalExamOpenNotification(
        string $branchCode,
        ?string $closesAt,
        string $notificationTemplate
    ): void {
        $template = trim($notificationTemplate);

        if ($template === '') {
            return;
        }

        $message = $this->fillTemplatePlaceholders($template, [
            'branchLabel' => $this->branchLabel($branchCode),
            'durationMinutes' => (string) $this->resolveMinutesUntil($closesAt),
        ]);

        if (trim($message) === '') {
            return;
        }

        $this->dashboardCommunicationService->addNotification([
            'title' => 'الاختبار النهائي',
            'message' => $message,
            'targetBranchId' => $branchCode,
            'createdByName' => 'النظام',
            'createdByRole' => 'system',
        ]);
    }

    private function resolveAssessmentTargetBranches(object $course, string $assessmentType, array $windows): array
    {
        $globalWindow = data_get($windows, "global.$assessmentType");

        if ($this->assessmentWindowHasValue($globalWindow)) {
            return ['male', 'female'];
        }

        $branches = [];

        foreach (['male', 'female'] as $branchCode) {
            $enabledColumn = sprintf('%s_%s_enabled', $branchCode, $assessmentType);
            $branchWindow = data_get($windows, "$branchCode.$assessmentType");

            if ((bool) ($course->{$enabledColumn} ?? false) && $this->assessmentWindowHasValue($branchWindow)) {
                $branches[] = $branchCode;
            }
        }

        return $branches;
    }

    private function assessmentWindowHasValue(mixed $window): bool
    {
        if (is_array($window)) {
            return trim((string) ($window['closesAt'] ?? '')) !== '';
        }

        return trim((string) $window) !== '';
    }

    private function resolveAssessmentDurationMinutes(array $windows, string $assessmentType, string $branchCode): int
    {
        $globalWindow = data_get($windows, "global.$assessmentType");
        $branchWindow = data_get($windows, "$branchCode.$assessmentType");
        $window = $this->assessmentWindowHasValue($globalWindow) ? $globalWindow : $branchWindow;

        if (is_array($window) && isset($window['durationMinutes'])) {
            return max(0, (int) $window['durationMinutes']);
        }

        $closesAt = is_array($window) ? ($window['closesAt'] ?? null) : $window;

        return $this->resolveMinutesUntil(is_string($closesAt) ? $closesAt : null);
    }

    private function resolveMinutesUntil(?string $closesAt): int
    {
        if (! $closesAt) {
            return 0;
        }

        try {
            return max(1, (int) ceil(now()->diffInSeconds(Carbon::parse($closesAt), false) / 60));
        } catch (\Throwable) {
            return 0;
        }
    }

    private function fillTemplatePlaceholders(string $template, array $replacements): string
    {
        $pairs = [];

        foreach ($replacements as $key => $value) {
            $pairs['{'.$key.'}'] = (string) $value;
        }

        return strtr($template, $pairs);
    }

    private function assessmentLabel(string $assessmentType): string
    {
        return [
            'pre' => 'الاختبار القبلي',
            'post' => 'الاختبار البعدي',
            'tasks' => 'المهام الأدائية',
        ][$assessmentType] ?? $assessmentType;
    }

    private function branchLabel(string $branchCode): string
    {
        return [
            'male' => 'معلمين',
            'female' => 'معلمات',
        ][$this->normalizeBranchCode($branchCode)] ?? $branchCode;
    }

    private function normalizeBranchCode(string $branchCode): string
    {
        $branchCode = trim($branchCode);

        if (! in_array($branchCode, ['male', 'female'], true)) {
            throw ValidationException::withMessages(['branchCode' => 'رمز الفرع غير صالح.']);
        }

        return $branchCode;
    }

    private function hasAssessmentWindowOpened(array $previousWindows, array $nextWindows, string $assessmentType): bool
    {
        foreach (['global', 'male', 'female'] as $scope) {
            $previous = data_get($previousWindows, "$scope.$assessmentType");
            $next = data_get($nextWindows, "$scope.$assessmentType");

            if (! $this->assessmentWindowHasValue($previous) && $this->assessmentWindowHasValue($next)) {
                return true;
            }
        }

        return false;
    }

    private function mapCourseRow(object $course, array $courseQuestions): array
    {
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
            'assessmentWindows' => $this->decodeJsonObject(
                $course->assessment_windows,
                ['global' => [], 'male' => [], 'female' => []]
            ),
            'assessmentNotificationTemplates' => $this->decodeJsonObject(
                $course->assessment_notification_templates,
                ['pre' => '', 'post' => '', 'tasks' => '']
            ),
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
    }

    private function normalizeCourseQuestions(Collection $items, bool $includeAnswerKey = false): array
    {
        return $items->map(fn ($item) => [
            'id' => $item->id,
            'prompt' => $item->prompt,
            'type' => $this->mapQuestionType($item->question_type, $item->options),
            'options' => $this->decodeJsonArray($item->options),
            'allowFile' => (bool) $item->allow_file,
            'points' => (int) $item->points,
            'correctAnswer' => $includeAnswerKey ? ($item->correct_answer ?? '') : '',
            'attachmentName' => $item->attachment_name ?? '',
            'attachmentType' => $item->attachment_type ?? '',
            'attachmentDataUrl' => $this->assessmentAttachmentService->temporaryUrl(
                $item->attachment_path ?? null,
                $item->attachment_data_url ?? null,
            ),
        ])->values()->all();
    }

    private function decodeJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return array_values($value);
        }

        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? array_values($decoded) : [];
    }

    private function decodeJsonObject(mixed $value, array $default): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return $default;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : $default;
    }
}
