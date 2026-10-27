<?php

namespace App\Support;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Explicit facade for application data; DB remains available for global auth and migrations. */
final class DepartmentData
{
    public const TABLES = [
        'users', 'students', 'reciters', 'reciter_students', 'student_parts', 'courses',
        'satisfaction_questions', 'satisfaction_responses', 'satisfaction_templates',
        'final_exam_settings', 'final_exam_questions', 'final_exam_submissions',
        'final_exam_submission_answers', 'role_permissions', 'notifications', 'task_templates',
        'course_questions', 'course_submissions', 'course_submission_answers', 'course_attendance',
        'push_subscriptions', 'archives', 'registration_settings', 'registration_requests',
        'app_settings', 'completion_requirement_settings', 'student_completion_results',
        'course_score_settings', 'course_manual_scores', 'course_score_history', 'attendance_sessions', 'course_enrollments',
        'training_materials', 'editor_assets', 'media', 'dashboard_access_events',
    ];

    public static function table($table, $as = null): DepartmentQueryBuilder
    {
        return self::query()->from($table, $as);
    }

    public static function query(?ConnectionInterface $connection = null): DepartmentQueryBuilder
    {
        $connection ??= DB::connection();

        return new DepartmentQueryBuilder($connection, $connection->getQueryGrammar(), $connection->getPostProcessor());
    }

    /** Old numbers stay reserved even when their account is archived or deleted. */
    public static function reserveLoginCode(string $loginCode, ?string $userId = null, ?string $departmentId = null): void
    {
        $loginCode = trim($loginCode);
        if ($loginCode === '' || ! DB::getSchemaBuilder()->hasTable('reserved_login_codes')) {
            return;
        }

        if (func_num_args() < 3) {
            $departmentId = DepartmentContext::id();
        }
        $hasOrigin = DB::getSchemaBuilder()->hasColumn('reserved_login_codes', 'department_id');
        if ($hasOrigin && $userId === null && $departmentId === null) {
            throw ValidationException::withMessages(['department_id' => 'اختر الإدارة أولًا.']);
        }

        DB::transaction(function () use ($loginCode, $userId, $departmentId, $hasOrigin): void {
            $values = ['login_code' => $loginCode, 'user_id' => $userId, 'created_at' => now()];
            if ($hasOrigin) {
                $values['department_id'] = $departmentId;
            }
            $inserted = DB::table('reserved_login_codes')->insertOrIgnore($values);
            $reservation = DB::table('reserved_login_codes')->where('login_code', $loginCode)->lockForUpdate()->first();
            $sameOwner = $userId !== null && (string) $reservation?->user_id === $userId;
            $sameProvisionalDepartment = $hasOrigin && $userId === null && $reservation?->user_id === null
                && $departmentId !== null && $reservation?->department_id === $departmentId;

            if (! $inserted && ! $sameOwner && ! $sameProvisionalDepartment) {
                throw ValidationException::withMessages(['login_code' => 'رقم الدخول مستخدم مسبقًا.']);
            }
        });
    }

    public static function __callStatic(string $method, array $arguments): mixed
    {
        return DB::$method(...$arguments);
    }
}
