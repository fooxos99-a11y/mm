<?php

namespace App\Services;

use App\Models\Department;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class DepartmentManagementService
{
    public function list(): array
    {
        return Department::query()->orderBy('created_at')->get()->map(fn ($department) => $this->present($department))->all();
    }

    public function accounts(string $loginCode): array
    {
        if ($loginCode === '') {
            return [];
        }

        return User::query()->where('login_code', trim($loginCode))->where('role', '!=', 'super_admin')
            ->limit(1)->get()->map(fn ($user) => [
                'id' => $user->id, 'name' => $user->full_name, 'loginCode' => $user->login_code,
                'role' => $user->role, 'departmentId' => $user->department_id,
                'departmentName' => DB::table('departments')->where('id', $user->department_id)->value('name'),
            ])->all();
    }

    public function save(array $data, ?string $id = null): array
    {
        return DB::transaction(function () use ($data, $id): array {
            $department = $id ? Department::query()->lockForUpdate()->findOrFail($id) : new Department;
            $isNew = ! $department->exists;
            $department->fill([
                'name' => trim($data['name']), 'manager_title' => trim($data['managerTitle']),
                'is_active' => $data['isActive'] ?? true,
            ]);
            $manager = User::query()->where('login_code', trim($data['managerLoginCode']))->lockForUpdate()->first();
            if (! $manager || ! $manager->is_active || ! in_array($manager->role, ['unassigned', 'admin'], true)) {
                throw ValidationException::withMessages([
                    'managerLoginCode' => 'اختر حسابًا مسجّلًا ومتاحًا لتعيينه مسؤولًا للإدارة.',
                ]);
            }
            if ($manager->department_id && ($isNew || $manager->department_id !== $department->id)) {
                throw ValidationException::withMessages(['managerLoginCode' => 'هذا الحساب مرتبط بإدارة أخرى.']);
            }
            $oldManagerId = $department->manager_user_id;
            $department->manager_user_id = $manager->id;
            $department->save();
            $manager->forceFill(['department_id' => $department->id, 'role' => 'admin'])->save();
            if ($oldManagerId !== $manager->id || $department->wasChanged('is_active')) {
                $manager->invalidateAuthentication();
            }
            if ($oldManagerId && $oldManagerId !== $manager->id) {
                $old = User::query()->find($oldManagerId);
                if ($old) {
                    $old->forceFill(['role' => 'unassigned', 'department_id' => null])->save();
                    $old->invalidateAuthentication();
                }
            }
            if ($isNew) {
                $this->initialize($department->id);
            }

            return $this->present($department);
        });
    }

    public function overview(): array
    {
        $departments = $this->list();
        $totals = ['departments' => count($departments), 'users' => 0, 'students' => 0, 'courses' => 0, 'archives' => 0];
        $combined = [];
        foreach ($departments as &$department) {
            $counts = [];
            foreach (['users', 'students', 'courses', 'archives'] as $table) {
                $query = DB::table($table)->where('department_id', $department['id']);
                if (in_array($table, ['students', 'courses'], true)) {
                    $query->whereNull('archive_id');
                }
                $counts[$table] = $query->count();
                $totals[$table] += $counts[$table];
            }
            $rawTotals = DepartmentContext::run($department['id'], function (): array {
                $all = [];
                foreach (['male', 'female'] as $branch) {
                    foreach (app(DashboardOverviewService::class)->totals($branch) as $key => [$count, $total]) {
                        $all[$key] = [($all[$key][0] ?? 0) + $count, ($all[$key][1] ?? 0) + $total];
                    }
                }

                return $all;
            });
            foreach ($rawTotals as $key => [$count, $total]) {
                $combined[$key] = [($combined[$key][0] ?? 0) + $count, ($combined[$key][1] ?? 0) + $total];
            }
            $department['counts'] = $counts;
            $department['indicators'] = app(DashboardOverviewService::class)->indicators($rawTotals);
        }

        return ['departments' => $departments, 'totals' => $totals,
            'indicators' => app(DashboardOverviewService::class)->indicators($combined)];
    }

    private function initialize(string $departmentId): void
    {
        // Copy configuration only. No users, courses, answers or historical records are copied.
        foreach (['role_permissions', 'app_settings'] as $table) {
            $rows = DB::table($table)->where('department_id', DepartmentContext::DEFAULT_ID)->get();
            foreach ($rows as $row) {
                $payload = (array) $row;
                $payload['department_id'] = $departmentId;
                DB::table($table)->insert($payload);
            }
        }
        DB::table('registration_settings')->insert([
            'department_id' => $departmentId, 'key' => 'is_open', 'value' => '0', 'updated_at' => now(),
        ]);
        foreach (['male' => 30, 'female' => 10] as $branch => $parts) {
            DB::table('final_exam_settings')->insert([
                'department_id' => $departmentId, 'branch_code' => $branch,
                'is_enabled' => false, 'notification_template' => '',
            ]);
            DB::table('completion_requirement_settings')->insert([
                'department_id' => $departmentId, 'branch_code' => $branch,
                'attendance_required' => 10, 'tasks_percentage_required' => 80,
                'final_exam_percentage_required' => 70, 'quran_parts_required' => $parts,
                'is_closed' => false, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    private function present(Department $department): array
    {
        $manager = $department->manager_user_id ? User::query()->find($department->manager_user_id) : null;

        return ['id' => $department->id, 'name' => $department->name,
            'isActive' => (bool) $department->is_active, 'managerTitle' => $department->manager_title,
            'manager' => $manager ? ['id' => $manager->id, 'name' => $manager->full_name,
                'loginCode' => $manager->login_code] : null];
    }
}
