<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait ManagesCourseLifecycle
{
    public function deleteCourse(string $courseId): void
    {
        $course = DB::table('courses')->where('id', $courseId)->first();

        if ($course && $this->hasCourseSubmissions($course)) {
            throw ValidationException::withMessages([
                'courseId' => 'لا يمكن حذف دورة أو مهمة توجد لها إجابات محفوظة.',
            ]);
        }

        DB::table('courses')->where('id', $courseId)->delete();
    }

    public function updateCoursesSortOrder(array $orderedIds): void
    {
        DB::transaction(function () use ($orderedIds): void {
            foreach (array_values($orderedIds) as $index => $id) {
                DB::table('courses')->where('id', $id)->update(['sort_order' => $index]);
            }
        });
    }

    public function activateCourse(string $courseId, ?array $settings = null): void
    {
        $course = DB::table('courses')->where('id', $courseId)->first();

        if (! $course) {
            throw ValidationException::withMessages(['courseId' => 'الدورة المحددة غير موجودة.']);
        }

        $wasPreEnabled = (bool) $course->is_pre_enabled;
        $wasPostEnabled = (bool) $course->is_post_enabled;
        $entityType = (string) ($course->entity_type ?? 'course');

        DB::transaction(function () use ($courseId, $settings, $entityType): void {
            if ($entityType === 'task' && (bool) ($settings['tasks'] ?? false)) {
                $this->closeOtherOpenedTaskCourses($courseId);
            }

            DB::table('courses')
                ->where('id', '!=', $courseId)
                ->where('entity_type', $entityType)
                ->update(['is_active' => false]);

            $payload = ['is_active' => true];

            if ($settings !== null) {
                $payload['is_pre_enabled'] = (bool) ($settings['pre'] ?? false);
                $payload['is_post_enabled'] = (bool) ($settings['post'] ?? false);
                $payload['is_tasks_enabled'] = (bool) ($settings['tasks'] ?? false);
            }

            DB::table('courses')->where('id', $courseId)->update($payload);
        });

        if ($settings !== null) {
            $freshCourse = DB::table('courses')->where('id', $courseId)->first();
            $templates = $this->decodeJsonObject($freshCourse?->assessment_notification_templates, ['pre' => '', 'post' => '', 'tasks' => '']);
            $windows = $this->decodeJsonObject($freshCourse?->assessment_windows, ['global' => [], 'male' => [], 'female' => []]);

            if ((bool) ($settings['pre'] ?? false) && ! $wasPreEnabled) {
                $this->dispatchAssessmentOpenNotification($freshCourse, 'pre', $templates, $windows);
            }

            if ((bool) ($settings['post'] ?? false) && ! $wasPostEnabled) {
                $this->dispatchAssessmentOpenNotification($freshCourse, 'post', $templates, $windows);
            }
        }
    }

    public function deactivateAllCourses(): void
    {
        DB::table('courses')->update(['is_active' => false]);
    }

    private function hasCourseSubmissions(object $course): bool
    {
        return DB::table('course_submissions')
            ->where('course_id', $course->id)
            ->when(
                $course->archive_id ?? null,
                fn ($query, $archiveId) => $query->where('archive_id', $archiveId),
                fn ($query) => $query->whereNull('archive_id'),
            )
            ->exists();
    }

    private function hasHistoricalCourseChanges(object $course, array $updates): bool
    {
        $comparisons = [
            'title' => [trim((string) ($course->title ?? '')), fn ($value): string => trim((string) $value)],
            'entityType' => [(string) ($course->entity_type ?? 'course'), fn ($value): string => $value === 'task' ? 'task' : 'course'],
            'taskMode' => [(string) ($course->task_mode ?? ''), fn ($value): string => (string) $value],
            'taskTemplateId' => [(string) ($course->task_template_id ?? ''), fn ($value): string => (string) ($value ?? '')],
            'taskTemplateName' => [(string) ($course->task_template_name ?? ''), fn ($value): string => (string) $value],
            'taskTemplateContent' => [(string) ($course->task_template_content ?? ''), fn ($value): string => (string) $value],
            'youtubeUrl' => [(string) ($course->youtube_url ?? ''), fn ($value): string => (string) $value],
            'taskDescription' => [(string) ($course->task_description ?? ''), fn ($value): string => (string) $value],
        ];

        foreach ($comparisons as $key => [$currentValue, $normalize]) {
            if (array_key_exists($key, $updates) && $normalize($updates[$key]) !== $currentValue) {
                return true;
            }
        }

        return false;
    }
}
