<?php

namespace App\Support\Security;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class DashboardPermissionResolver
{
    /**
     * @var array<string, list<string>>
     */
    private const DIRECT_PERMISSIONS = [
        'people' => ['page_users'],
        'completion-close' => ['close_completion_results'],
        'completion-update' => ['edit_completion_requirements'],
        'completion-view' => ['page_completion_requirements'],
        'final-exam' => ['page_final_exam'],
        'materials' => ['page_materials'],
        'notifications' => ['page_notifications'],
        'reciter-delete' => ['delete_reciter'],
        'registration-accept' => ['add_student'],
        'registration-update' => ['edit_student'],
        'registration-view' => ['page_registration'],
        'results' => ['page_results'],
        'satisfaction' => ['page_satisfaction'],
        'student-add' => ['add_student'],
        'student-delete' => ['delete_student'],
        'student-edit' => ['edit_student'],
        'task-edit' => ['edit_tasks'],
        'transfer-student' => ['transfer_reciter_student'],
    ];

    /**
     * @return array{adminOnly: bool, permissions: list<string>, requireAll: bool}|null
     */
    public function resolve(Request $request, string $capability): ?array
    {
        if ($capability === 'admin') {
            return $this->result(adminOnly: true);
        }

        if (isset(self::DIRECT_PERMISSIONS[$capability])) {
            return $this->result(permissions: self::DIRECT_PERMISSIONS[$capability]);
        }

        return match ($capability) {
            'assessment-import' => $this->result(
                permissions: $this->assessmentTypePermissions((string) $request->input('assessmentType')),
            ),
            'course-activate' => $this->courseActivationPermissions($request),
            'course-deactivate-all' => $this->result(
                permissions: ['edit_pre_questions', 'edit_post_questions', 'edit_tasks'],
                requireAll: true,
            ),
            'course-sort' => $this->courseSortPermissions($request),
            'course-destroy' => $this->courseResourcePermissions($request),
            'course-question' => $this->result(
                permissions: $this->courseQuestionPermissions($request),
            ),
            'course-store' => $this->result(
                permissions: $this->courseEntityPermissions((string) $request->input('entityType', 'course')),
                requireAll: true,
            ),
            'course-update' => $this->courseResourcePermissions($request, true),
            'editor-image' => $this->result(permissions: [
                'edit_pre_questions',
                'edit_post_questions',
                'edit_tasks',
                'page_final_exam',
                'page_notifications',
            ]),
            'reciter-store' => $this->result(permissions: [
                $request->filled('currentLoginCode') ? 'edit_reciter' : 'add_reciter',
            ]),
            default => null,
        };
    }

    /**
     * @param  list<string>  $permissions
     * @return array{adminOnly: bool, permissions: list<string>, requireAll: bool}
     */
    private function result(
        array $permissions = [],
        bool $requireAll = false,
        bool $adminOnly = false,
    ): array {
        return compact('adminOnly', 'permissions', 'requireAll');
    }

    /**
     * @return array{adminOnly: bool, permissions: list<string>, requireAll: bool}
     */
    private function courseResourcePermissions(Request $request, bool $includeRequestedEntityType = false): array
    {
        $courseId = trim((string) $request->route('courseId', ''));
        $entityType = (string) DB::table('courses')->where('id', $courseId)->value('entity_type');
        $permissions = $this->courseEntityPermissions($entityType);

        if ($includeRequestedEntityType && $request->exists('entityType')) {
            $permissions = array_merge(
                $permissions,
                $this->courseEntityPermissions((string) $request->input('entityType')),
            );
        }

        return $this->result(
            permissions: array_values(array_unique($permissions)),
            requireAll: true,
        );
    }

    /**
     * @return list<string>
     */
    private function courseQuestionPermissions(Request $request): array
    {
        $assessmentType = trim((string) $request->input('assessmentType', ''));

        if ($assessmentType === '') {
            $assessmentType = (string) DB::table('course_questions')
                ->where('id', trim((string) $request->route('questionId', '')))
                ->value('assessment_type');
        }

        return $this->assessmentTypePermissions($assessmentType);
    }

    /**
     * @return array{adminOnly: bool, permissions: list<string>, requireAll: bool}
     */
    private function courseActivationPermissions(Request $request): array
    {
        $permissions = [];

        foreach (
            ['pre' => 'open_pre_exam', 'post' => 'open_post_exam', 'tasks' => 'edit_tasks'] as $field => $permission
        ) {
            if ($request->exists($field)) {
                $permissions[] = $permission;
            }
        }

        if ($permissions === []) {
            $entityType = (string) DB::table('courses')
                ->where('id', trim((string) $request->route('courseId', '')))
                ->value('entity_type');
            $permissions = $entityType === 'task'
                ? ['edit_tasks']
                : ['open_pre_exam', 'open_post_exam'];
        }

        return $this->result(
            permissions: array_values(array_unique($permissions)),
            requireAll: true,
        );
    }

    /**
     * @return array{adminOnly: bool, permissions: list<string>, requireAll: bool}
     */
    private function courseSortPermissions(Request $request): array
    {
        $entityTypes = DB::table('courses')
            ->whereIn('id', (array) $request->input('orderedIds', []))
            ->pluck('entity_type')
            ->unique();
        $permissions = [];

        if ($entityTypes->contains('task')) {
            $permissions[] = 'edit_tasks';
        }

        if ($entityTypes->contains(fn ($type) => $type !== 'task')) {
            $permissions = [...$permissions, 'edit_pre_questions', 'edit_post_questions'];
        }

        return $this->result(
            permissions: array_values(array_unique($permissions)),
            requireAll: true,
        );
    }

    /**
     * @return list<string>
     */
    private function courseEntityPermissions(string $entityType): array
    {
        return trim($entityType) === 'task'
            ? ['edit_tasks']
            : ['edit_pre_questions', 'edit_post_questions'];
    }

    /**
     * @return list<string>
     */
    private function assessmentTypePermissions(string $assessmentType): array
    {
        return match (trim($assessmentType)) {
            'pre' => ['edit_pre_questions'],
            'post' => ['edit_post_questions'],
            'tasks' => ['edit_tasks'],
            default => [],
        };
    }
}
