<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sessions') || ! Schema::hasColumn('sessions', 'user_id')) {
            return;
        }

        $columnType = Schema::getColumnType('sessions', 'user_id');

        if (in_array($columnType, ['char', 'string', 'text', 'varchar'], true)) {
            return;
        }

        DB::table('sessions')->delete();

        Schema::table('sessions', function (Blueprint $table): void {
            $table->uuid('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        // UUID user identifiers cannot be represented safely as integers.
    }
};
