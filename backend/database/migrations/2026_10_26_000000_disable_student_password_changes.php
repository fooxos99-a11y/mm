<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->whereIn('role', ['student', 'trainee'])
            ->where('must_change_password', true)->update(['must_change_password' => false]);
    }

    public function down(): void
    {
        // A rollback must not force learners to change administrator-managed credentials.
    }
};
