<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // An accepted request can outlive its deleted account/student, or retain
        // the previous login after an administrator changes the student's number.
        DB::table('registration_requests')->where('status', 'accepted')->whereNotNull('login_code')
            ->orderByRaw('COALESCE(reviewed_at, created_at)')->orderBy('created_at')->orderBy('id')
            ->chunk(500, function ($requests): void {
                foreach ($requests as $request) {
                    $loginCode = trim((string) $request->login_code);
                    if ($loginCode === '') {
                        continue;
                    }

                    // Existing ownership/origin always wins. This migration only
                    // fills missing reservations and never reassigns an identity.
                    DB::table('reserved_login_codes')->insertOrIgnore([
                        'login_code' => $loginCode,
                        'user_id' => null,
                        'department_id' => $request->department_id,
                        'created_at' => $request->reviewed_at ?: $request->created_at ?: now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Historical login numbers must remain reserved after a code rollback.
    }
};
