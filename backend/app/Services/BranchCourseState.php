<?php

namespace App\Services;

use App\Models\Student;
use App\Support\DepartmentContext;
use App\Support\DepartmentData as DB;

final class BranchCourseState
{
    public function managedBranch(): ?string
    {
        $role = DepartmentContext::effectiveRole((string) ((auth('sanctum')->user() ?: auth()->user())?->role ?? ''));

        return ['male_manager' => 'male', 'female_manager' => 'female'][$role] ?? null;
    }

    public function viewerBranch(): ?string
    {
        if ($branch = $this->managedBranch()) {
            return $branch;
        }
        $user = auth('sanctum')->user() ?: auth()->user();
        if (! in_array($user?->role, ['student', 'trainee'], true)) {
            return null;
        }
        $key = 'course-viewer-branch:'.$user->id;
        if (! request()->attributes->has($key)) {
            request()->attributes->set($key, Student::query()->with('branch')->where('login_code', $user->login_code)->first()?->branch?->code);
        }

        return request()->attributes->get($key);
    }

    public function isActive(object $course): bool
    {
        $branch = $this->viewerBranch();
        if (! $branch) {
            return (bool) $course->is_active;
        }

        return (bool) $course->is_active && collect(['pre', 'post', 'tasks'])->contains(fn ($type) => (bool) $course->{'is_'.$type.'_enabled'} && (bool) $course->{$branch.'_'.$type.'_enabled'});
    }

    /** Apply operational settings to one branch; shared content uses the existing course service. */
    public function apply(string $id, array $updates): array
    {
        $branch = $this->managedBranch();
        if (! $branch) {
            return $updates;
        }
        $keys = ['isActive', 'isPreEnabled', 'isPostEnabled', 'isTasksEnabled', 'branchAvailability', 'assessmentWindows'];
        if (! array_intersect($keys, array_keys($updates))) {
            return $updates;
        }
        DB::transaction(function () use ($id, $updates, $branch): void {
            DB::table('departments')->where('id', DepartmentContext::id())->lockForUpdate()->first();
            $course = DB::table('courses')->where('id', $id)->lockForUpdate()->first();
            abort_unless($course, 404);
            $other = $branch === 'male' ? 'female' : 'male';
            $windows = json_decode($course->assessment_windows ?? '{}', true) ?: [];
            $payload = [];
            foreach (['pre' => 'isPreEnabled', 'post' => 'isPostEnabled', 'tasks' => 'isTasksEnabled'] as $type => $key) {
                $global = 'is_'.$type.'_enabled';
                $own = $branch.'_'.$type.'_enabled';
                $foreign = $other.'_'.$type.'_enabled';
                $ownEnabled = (bool) $course->is_active && (bool) $course->$global && (bool) $course->$own;
                $otherEnabled = (bool) $course->is_active && (bool) $course->$global && (bool) $course->$foreign;
                if (array_key_exists($key, $updates)) {
                    $ownEnabled = (bool) $updates[$key];
                }
                if (array_key_exists($type, $updates['branchAvailability'][$branch] ?? [])) {
                    $ownEnabled = (bool) $updates['branchAvailability'][$branch][$type];
                }
                if (($updates['isActive'] ?? null) === false) {
                    $ownEnabled = false;
                }
                $payload[$own] = $ownEnabled;
                $payload[$foreign] = $otherEnabled;
                $payload[$global] = $ownEnabled || $otherEnabled;
                if (array_key_exists($type, $updates['assessmentWindows'][$branch] ?? []) || ! $ownEnabled) {
                    // Preserve an administrator's shared window for the other branch before separating it.
                    if (! empty($windows['global'][$type])) {
                        $windows[$other][$type] ??= $windows['global'][$type];
                        $windows['global'][$type] = null;
                    }
                    $windows[$branch][$type] = array_key_exists($type, $updates['assessmentWindows'][$branch] ?? [])
                        ? $updates['assessmentWindows'][$branch][$type] : ($ownEnabled ? ($windows[$branch][$type] ?? null) : null);
                }
            }
            $payload['is_active'] = $payload['is_pre_enabled'] || $payload['is_post_enabled'] || $payload['is_tasks_enabled'];
            $payload['assessment_windows'] = json_encode($windows, JSON_UNESCAPED_UNICODE);
            DB::table('courses')->where('id', $id)->update($payload);
            if ($course->entity_type === 'task' && $payload[$branch.'_tasks_enabled']
                && ! ((bool) $course->is_active && (bool) $course->is_tasks_enabled && (bool) $course->{$branch.'_tasks_enabled'})) {
                $this->closeOthers($id, 'task');
            }
        });

        return array_diff_key($updates, array_flip($keys));
    }

    public function closeOthers(?string $except, ?string $entityType = null): void
    {
        DB::transaction(function () use ($except, $entityType): void {
            DB::table('departments')->where('id', DepartmentContext::id())->lockForUpdate()->first();
            $ids = DB::table('courses')->whereNull('archive_id')->when($except, fn ($query) => $query->where('id', '!=', $except))
                ->when($entityType, fn ($query) => $query->where('entity_type', $entityType))->orderBy('id')->pluck('id');
            foreach ($ids as $id) {
                $this->apply($id, ['isActive' => false]);
            }
        });
    }

    public function activate(string $id, ?array $settings): void
    {
        DB::transaction(function () use ($id, $settings): void {
            DB::table('departments')->where('id', DepartmentContext::id())->lockForUpdate()->first();
            $course = DB::table('courses')->where('id', $id)->lockForUpdate()->first();
            abort_unless($course, 404);
            $this->closeOthers($id, $course->entity_type ?? 'course');
            $settings ??= ['pre' => (bool) $course->is_pre_enabled, 'post' => (bool) $course->is_post_enabled, 'tasks' => (bool) $course->is_tasks_enabled];
            $this->apply($id, ['isActive' => true, 'branchAvailability' => [$this->managedBranch() => $settings]]);
        });
    }

    public function assertCanDeleteCourse(string $id): void
    {
        if (! $branch = $this->managedBranch()) {
            return;
        }
        $ownLogins = Student::query()->whereHas('branch', fn ($query) => $query->where('code', $branch))->pluck('login_code');
        foreach (['course_submissions', 'course_attendance', 'satisfaction_responses'] as $table) {
            abort_if(DB::table($table)->where('course_id', $id)->whereNotIn('login_code', $ownLogins)->exists(), 403,
                'لا يمكن حذف محتوى مشترك مرتبط بسجلات فرع آخر.');
        }
        abort_if(DB::table('course_score_settings')->where('course_id', $id)->where('branch_code', '!=', $branch)->exists(), 403,
            'لا يمكن حذف محتوى مشترك مرتبط بدرجات فرع آخر.');
    }
}
