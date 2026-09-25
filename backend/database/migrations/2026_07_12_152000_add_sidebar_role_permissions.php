<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $rules = [
            'page_overview' => true,
            'page_courses' => ['edit_pre_questions', 'open_pre_exam', 'edit_post_questions', 'open_post_exam'],
            'page_tasks' => ['edit_tasks'],
            'page_final_exam' => false,
            'page_satisfaction' => false,
            'page_users' => ['add_student', 'delete_student', 'edit_student', 'add_reciter', 'delete_reciter', 'edit_reciter', 'transfer_reciter_student'],
            'page_materials' => ['page_notifications'],
            'page_archive' => false,
            'page_registration' => ['add_student', 'edit_student'],
            'page_completion_requirements' => false,
            'edit_completion_requirements' => false,
            'close_completion_results' => false,
        ];

        foreach (['male_manager', 'female_manager'] as $role) {
            $existing = DB::table('role_permissions')
                ->where('role', $role)
                ->pluck('is_enabled', 'permission_key');

            foreach ($rules as $key => $source) {
                $enabled = is_bool($source)
                    ? $source
                    : collect($source)->contains(fn (string $permission): bool => (bool) ($existing[$permission] ?? false));

                DB::table('role_permissions')->updateOrInsert(
                    ['role' => $role, 'permission_key' => $key],
                    ['is_enabled' => $enabled],
                );
            }
        }
    }

    public function down(): void
    {
        DB::table('role_permissions')->whereIn('permission_key', [
            'page_overview', 'page_courses', 'page_tasks', 'page_final_exam', 'page_satisfaction',
            'page_users', 'page_materials', 'page_archive', 'page_registration',
            'page_completion_requirements', 'edit_completion_requirements', 'close_completion_results',
        ])->delete();
    }
};
