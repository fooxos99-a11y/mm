<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait CreatesAndUpdatesCourses
{
    public function createCourse(string $title, bool $isActive, array $options = []): array
    {
        $title = trim($title);
        $entityType = ($options['entityType'] ?? 'course') === 'task' ? 'task' : 'course';
        $taskMode = $entityType === 'task'
            ? (($options['taskMode'] ?? 'questions') === 'document' ? 'document' : 'questions')
            : null;

        if ($title === '') {
            throw ValidationException::withMessages(['title' => 'اسم الدورة مطلوب.']);
        }

        $courseId = (string) str()->uuid();
        $createdAt = now();

        DB::transaction(function () use (
            $courseId,
            $createdAt,
            $title,
            $isActive,
            $entityType,
            $taskMode,
            $options
        ): void {
            if ($isActive && $entityType !== 'task') {
                DB::table('courses')->update(['is_active' => false]);
            }

            DB::table('courses')->insert([
                'id' => $courseId,
                'title' => $title,
                'entity_type' => $entityType,
                'task_mode' => $taskMode,
                'task_template_id' => ($options['taskTemplateId'] ?? '') !== '' ? $options['taskTemplateId'] : null,
                'task_template_name' => $options['taskTemplateName'] ?? '',
                'task_template_content' => $options['taskTemplateContent'] ?? '',
                'youtube_url' => $options['youtubeUrl'] ?? '',
                'task_description' => $options['taskDescription'] ?? '',
                'is_active' => $entityType === 'task' ? false : $isActive,
                'is_pre_enabled' => true,
                'is_post_enabled' => true,
                'is_tasks_enabled' => false,
                'male_pre_enabled' => true,
                'female_pre_enabled' => true,
                'male_post_enabled' => true,
                'female_post_enabled' => true,
                'male_tasks_enabled' => true,
                'female_tasks_enabled' => true,
                'assessment_windows' => json_encode(
                    ['global' => [], 'male' => [], 'female' => []],
                    JSON_UNESCAPED_UNICODE
                ),
                'assessment_notification_templates' => json_encode(
                    ['pre' => '', 'post' => '', 'tasks' => ''],
                    JSON_UNESCAPED_UNICODE
                ),
                'sort_order' => (int) DB::table('courses')->count(),
                'created_at' => $createdAt,
            ]);

            if ($entityType === 'task' && $taskMode === 'document') {
                DB::table('course_questions')->insert([
                    'id' => (string) str()->uuid(),
                    'course_id' => $courseId,
                    'assessment_type' => 'tasks',
                    'question_type' => 'text',
                    'prompt' => 'إرفاق ملف المهمة الأدائية',
                    'options' => json_encode([], JSON_UNESCAPED_UNICODE),
                    'allow_file' => true,
                    'points' => max(0, (int) ($options['taskPoints'] ?? 1)),
                    'correct_answer' => '',
                    'attachment_name' => '',
                    'attachment_type' => '',
                    'attachment_path' => null,
                    'attachment_data_url' => '',
                    'sort_order' => 0,
                    'created_at' => $createdAt,
                ]);
            }
        });

        $course = DB::table('courses')->where('id', $courseId)->first();

        return $this->mapCourseRow($course, ['pre' => [], 'post' => [], 'tasks' => []]);
    }

    public function updateCourse(string $courseId, array $updates): void
    {
        $course = DB::table('courses')->where('id', $courseId)->first();

        if (! $course) {
            throw ValidationException::withMessages(['courseId' => 'الدورة المحددة غير موجودة.']);
        }

        if ($this->hasHistoricalCourseChanges($course, $updates) && $this->hasCourseSubmissions($course)) {
            throw ValidationException::withMessages([
                'courseId' => 'لا يمكن تغيير محتوى الدورة أو المهمة بعد وجود إجابات محفوظة.',
            ]);
        }

        $payload = [];
        $wasTasksEnabled = (bool) $course->is_tasks_enabled;
        $previousWindows = $this->decodeJsonObject(
            $course->assessment_windows,
            ['global' => [], 'male' => [], 'female' => []]
        );

        if (array_key_exists('title', $updates)) {
            $payload['title'] = trim((string) $updates['title']);
        }

        if (array_key_exists('entityType', $updates)) {
            $payload['entity_type'] = $updates['entityType'] === 'task' ? 'task' : 'course';
        }

        if (array_key_exists('isActive', $updates)) {
            $payload['is_active'] = (bool) $updates['isActive'];
        }

        if (array_key_exists('isPreEnabled', $updates)) {
            $payload['is_pre_enabled'] = (bool) $updates['isPreEnabled'];
        }

        if (array_key_exists('isPostEnabled', $updates)) {
            $payload['is_post_enabled'] = (bool) $updates['isPostEnabled'];
        }

        if (array_key_exists('isTasksEnabled', $updates)) {
            $payload['is_tasks_enabled'] = (bool) $updates['isTasksEnabled'];
        }

        if (isset($updates['branchAvailability']) && is_array($updates['branchAvailability'])) {
            $payload['male_pre_enabled'] = (bool) data_get(
                $updates,
                'branchAvailability.male.pre',
                $course->male_pre_enabled
            );
            $payload['female_pre_enabled'] = (bool) data_get(
                $updates,
                'branchAvailability.female.pre',
                $course->female_pre_enabled
            );
            $payload['male_post_enabled'] = (bool) data_get(
                $updates,
                'branchAvailability.male.post',
                $course->male_post_enabled
            );
            $payload['female_post_enabled'] = (bool) data_get(
                $updates,
                'branchAvailability.female.post',
                $course->female_post_enabled
            );
            $payload['male_tasks_enabled'] = (bool) data_get(
                $updates,
                'branchAvailability.male.tasks',
                $course->male_tasks_enabled
            );
            $payload['female_tasks_enabled'] = (bool) data_get(
                $updates,
                'branchAvailability.female.tasks',
                $course->female_tasks_enabled
            );
        }

        if (array_key_exists('assessmentWindows', $updates)) {
            $payload['assessment_windows'] = json_encode(
                array_replace_recursive($previousWindows, $updates['assessmentWindows']),
                JSON_UNESCAPED_UNICODE,
            );
        }

        if (array_key_exists('assessmentNotificationTemplates', $updates)) {
            $payload['assessment_notification_templates'] = json_encode(
                $updates['assessmentNotificationTemplates'],
                JSON_UNESCAPED_UNICODE
            );
        }

        if (array_key_exists('taskMode', $updates)) {
            $payload['task_mode'] = $updates['taskMode'];
        }

        if (array_key_exists('taskTemplateId', $updates)) {
            $payload['task_template_id'] = (($updates['taskTemplateId'] ?? '') !== '')
                ? $updates['taskTemplateId']
                : null;
        }

        if (array_key_exists('taskTemplateName', $updates)) {
            $payload['task_template_name'] = (string) $updates['taskTemplateName'];
        }

        if (array_key_exists('taskTemplateContent', $updates)) {
            $payload['task_template_content'] = (string) $updates['taskTemplateContent'];
        }

        if (array_key_exists('youtubeUrl', $updates)) {
            $payload['youtube_url'] = (string) $updates['youtubeUrl'];
        }

        if (array_key_exists('taskDescription', $updates)) {
            $payload['task_description'] = (string) $updates['taskDescription'];
        }

        $nextCourse = null;
        $nextWindows = ['global' => [], 'male' => [], 'female' => []];
        $templates = ['pre' => '', 'post' => '', 'tasks' => ''];
        $tasksJustOpened = false;
        $isTaskCourse = ($payload['entity_type'] ?? $course->entity_type ?? 'course') === 'task';

        DB::transaction(function () use (
            $courseId,
            $payload,
            $updates,
            $wasTasksEnabled,
            $previousWindows,
            &$nextCourse,
            &$nextWindows,
            &$templates,
            &$tasksJustOpened,
        ): void {
            if ($payload !== []) {
                DB::table('courses')->where('id', $courseId)->update($payload);
            }

            if (! (array_key_exists('isTasksEnabled', $updates) || array_key_exists('assessmentWindows', $updates))) {
                return;
            }

            $nextCourse = DB::table('courses')->where('id', $courseId)->first();

            if (! $nextCourse) {
                return;
            }

            $nextWindows = $this->decodeJsonObject(
                $nextCourse->assessment_windows,
                ['global' => [], 'male' => [], 'female' => []]
            );
            $templates = $this->decodeJsonObject(
                $nextCourse->assessment_notification_templates,
                ['pre' => '', 'post' => '', 'tasks' => '']
            );
            $tasksJustOpened = (bool) ($nextCourse->is_tasks_enabled ?? false)
                && (! $wasTasksEnabled || $this->hasAssessmentWindowOpened($previousWindows, $nextWindows, 'tasks'));

            if ($tasksJustOpened) {
                $this->closeOtherOpenedTaskCourses($courseId);
            }
        });

        if ($tasksJustOpened) {
            $nextCourse = DB::table('courses')->where('id', $courseId)->first();
            $nextWindows = $this->decodeJsonObject(
                $nextCourse?->assessment_windows,
                ['global' => [], 'male' => [], 'female' => []]
            );
            $templates = $this->decodeJsonObject(
                $nextCourse?->assessment_notification_templates,
                ['pre' => '', 'post' => '', 'tasks' => '']
            );
            $this->dispatchAssessmentOpenNotification($nextCourse, 'tasks', $templates, $nextWindows);
        }
    }

    private function closeOtherOpenedTaskCourses(string $activeTaskId): void
    {
        DB::table('courses')
            ->where('entity_type', 'task')
            ->where('id', '!=', $activeTaskId)
            ->orderBy('sort_order')
            ->get()
            ->each(function (object $task): void {
                $windows = $this->decodeJsonObject(
                    $task->assessment_windows,
                    ['global' => [], 'male' => [], 'female' => []]
                );

                $windows['global'] = [
                    ...((array) ($windows['global'] ?? [])),
                    'tasks' => null,
                ];
                $windows['male'] = [
                    ...((array) ($windows['male'] ?? [])),
                    'tasks' => null,
                ];
                $windows['female'] = [
                    ...((array) ($windows['female'] ?? [])),
                    'tasks' => null,
                ];

                DB::table('courses')->where('id', $task->id)->update([
                    'is_active' => false,
                    'is_tasks_enabled' => false,
                    'male_tasks_enabled' => false,
                    'female_tasks_enabled' => false,
                    'assessment_windows' => json_encode($windows, JSON_UNESCAPED_UNICODE),
                ]);
            });
    }
}
