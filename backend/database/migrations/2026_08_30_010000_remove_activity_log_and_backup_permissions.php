<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('activity_log');
        Schema::dropIfExists('activity_logs');

        if (Schema::hasTable('role_permissions')) {
            DB::table('role_permissions')
                ->whereIn('permission_key', [
                    'page_activity_log',
                    'backup_export',
                    'backup_import',
                    'backup_restore',
                ])
                ->delete();
        }

        if (Schema::hasTable('cache')) {
            DB::table('cache')
                ->where('key', 'like', '%dashboard:activity_logs%')
                ->delete();
        }
    }

    public function down(): void
    {
        // The removed features and their data are intentionally not restored.
    }
};
