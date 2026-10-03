<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('must_change_password', true)->update([
            'must_change_password' => false,
        ]);
    }

    public function down(): void
    {
        // The automatic flags must not be restored for accounts that can already sign in.
    }
};
