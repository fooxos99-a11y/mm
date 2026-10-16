<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reserved_login_codes', function (Blueprint $table): void {
            // The registry is global; origin is permanent metadata, not a query scope.
            $table->uuid('department_id')->nullable()->index();
        });

        DB::table('users')->whereNotNull('login_code')->orderBy('id')->chunk(500, function ($users): void {
            foreach ($users as $user) {
                $this->reserve($user->login_code, $user->department_id, $user->id);
            }
        });
        DB::table('students')->orderBy('id')->chunk(500, function ($students): void {
            foreach ($students as $student) {
                $this->reserve($student->login_code, $student->department_id);
                $this->reserve($student->archived_login_code, $student->department_id);
            }
        });
        // Older administrative imports allowed numbers without a Student/User record.
        // Reserve those as well before another department can acquire the same number.
        foreach (['course_submissions', 'final_exam_submissions', 'course_attendance', 'satisfaction_responses', 'push_subscriptions'] as $table) {
            DB::table($table)->whereNotNull('login_code')->select(['login_code', 'department_id'])
                ->distinct()->orderBy('login_code')->chunk(500, function ($rows): void {
                    foreach ($rows as $row) {
                        $this->reserve($row->login_code, $row->department_id);
                    }
                });
        }
    }

    public function down(): void
    {
        Schema::table('reserved_login_codes', function (Blueprint $table): void {
            $table->dropIndex(['department_id']);
            $table->dropColumn('department_id');
        });
    }

    private function reserve(?string $loginCode, ?string $departmentId, ?string $userId = null): void
    {
        $loginCode = trim((string) $loginCode);
        if ($loginCode === '') {
            return;
        }

        DB::table('reserved_login_codes')->insertOrIgnore([
            'login_code' => $loginCode, 'user_id' => $userId, 'department_id' => $departmentId, 'created_at' => now(),
        ]);
        $reservation = DB::table('reserved_login_codes')->where('login_code', $loginCode)->first();
        if ($departmentId !== null && $reservation->department_id !== null
            && $reservation->department_id !== $departmentId) {
            throw new RuntimeException('A historical login number belongs to multiple departments; reconcile its ownership before migrating.');
        }
        $updates = [];
        if ($reservation->department_id === null && $departmentId !== null) {
            $updates['department_id'] = $departmentId;
        }
        if ($reservation->user_id === null && $userId !== null) {
            $updates['user_id'] = $userId;
        }
        if ($updates !== []) {
            DB::table('reserved_login_codes')->where('login_code', $loginCode)->update($updates);
        }
    }
};
