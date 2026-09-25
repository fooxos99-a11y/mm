<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class E2EAccountSeeder extends Seeder
{
    private const PASSWORD = 'E2E-Role-2026!';

    private const MANAGER_PERMISSIONS = [
        'page_overview', 'page_courses', 'page_tasks', 'page_final_exam',
        'page_satisfaction', 'page_users', 'page_notifications', 'page_materials',
        'page_results', 'page_completion_requirements', 'page_registration',
        'edit_completion_requirements', 'close_completion_results',
        'add_student', 'delete_student', 'edit_student',
        'edit_pre_questions', 'edit_post_questions', 'edit_tasks',
        'open_pre_exam', 'open_post_exam',
        'add_reciter', 'delete_reciter', 'edit_reciter', 'transfer_reciter_student',
    ];

    public function run(): void
    {
        $maleBranch = Branch::query()->where('code', 'male')->firstOrFail();
        $femaleBranch = Branch::query()->where('code', 'female')->firstOrFail();

        $this->user('e2e-male-manager', 'مشرف الاختبار', 'male_manager');
        $this->user('e2e-female-manager', 'مشرفة الاختبار', 'female_manager');

        $student = Student::query()->updateOrCreate(
            ['login_code' => 'e2e-student-role'],
            [
                'full_name' => 'طالب الاختبار',
                'branch_id' => $maleBranch->id,
                'note' => 'حساب معزول لاختبارات الواجهة',
            ],
        );
        $this->user('e2e-student-role', 'طالب الاختبار', 'student');

        Student::query()->updateOrCreate(
            ['login_code' => 'e2e-trainee-role'],
            [
                'full_name' => 'معلم الاختبار',
                'branch_id' => $femaleBranch->id,
                'note' => 'حساب معزول لاختبارات الواجهة',
            ],
        );
        $this->user('e2e-trainee-role', 'معلم الاختبار', 'trainee');

        $reciterUser = $this->user('e2e-reciter-role', 'مقرئ الاختبار', 'reciter');
        $reciter = Reciter::query()->updateOrCreate(
            ['user_id' => $reciterUser->id],
            [
                'full_name' => 'مقرئ الاختبار',
                'branch_id' => $maleBranch->id,
            ],
        );
        $reciter->students()->sync([$student->id]);

        foreach (['male_manager', 'female_manager'] as $role) {
            foreach (self::MANAGER_PERMISSIONS as $permission) {
                DB::table('role_permissions')->updateOrInsert(
                    ['role' => $role, 'permission_key' => $permission],
                    ['is_enabled' => true],
                );
            }
        }

        DB::table('courses')->updateOrInsert(
            ['id' => '00000000-0000-4000-8000-000000000101'],
            [
                'title' => 'مهمة اختبار الواجهة',
                'entity_type' => 'task',
                'task_mode' => 'questions',
                'is_tasks_enabled' => true,
                'male_tasks_enabled' => true,
                'female_tasks_enabled' => true,
                'created_at' => now(),
            ],
        );

        DB::table('courses')->updateOrInsert(
            ['id' => '00000000-0000-4000-8000-000000000102'],
            [
                'title' => 'دورة اختبار الواجهة',
                'entity_type' => 'course',
                'is_active' => true,
                'is_pre_enabled' => true,
                'is_post_enabled' => true,
                'created_at' => now(),
            ],
        );
    }

    private function user(string $loginCode, string $name, string $role): User
    {
        return User::query()->updateOrCreate(
            ['login_code' => $loginCode],
            [
                'full_name' => $name,
                'role' => $role,
                'password' => Hash::make(self::PASSWORD),
                'must_change_password' => false,
            ],
        );
    }
}
