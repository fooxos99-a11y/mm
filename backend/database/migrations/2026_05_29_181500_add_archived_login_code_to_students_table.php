<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('archived_login_code')->nullable()->after('login_code');
            $table->index('archived_login_code');
        });

        $archivedStudents = DB::table('students')
            ->whereNotNull('archive_id')
            ->whereNull('archived_login_code')
            ->select(['id', 'login_code'])
            ->orderBy('created_at')
            ->get();

        if ($archivedStudents->isEmpty()) {
            return;
        }

        $originalLoginCodes = $archivedStudents
            ->pluck('login_code')
            ->filter(fn ($loginCode) => trim((string) $loginCode) !== '')
            ->values()
            ->all();

        foreach ($archivedStudents as $student) {
            $originalLoginCode = trim((string) $student->login_code);

            DB::table('students')
                ->where('id', $student->id)
                ->update([
                    'archived_login_code' => $originalLoginCode !== '' ? $originalLoginCode : null,
                    'login_code' => $this->generateArchivedLoginCode(),
                ]);
        }

        if ($originalLoginCodes !== []) {
            DB::table('users')
                ->where('role', 'student')
                ->whereIn('login_code', $originalLoginCodes)
                ->delete();
        }
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropIndex(['archived_login_code']);
            $table->dropColumn('archived_login_code');
        });
    }

    private function generateArchivedLoginCode(): string
    {
        do {
            $loginCode = 'archive-'.strtolower(substr(str_replace('-', '', (string) str()->uuid()), 0, 10));
        } while (
            DB::table('students')->where('login_code', $loginCode)->exists()
            || DB::table('users')->where('login_code', $loginCode)->exists()
        );

        return $loginCode;
    }
};
