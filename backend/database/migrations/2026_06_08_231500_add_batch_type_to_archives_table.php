<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('archives') && ! Schema::hasColumn('archives', 'batch_type')) {
            Schema::table('archives', function (Blueprint $table) {
                $table->string('batch_type', 10)->default('all')->after('name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('archives') && Schema::hasColumn('archives', 'batch_type')) {
            Schema::table('archives', function (Blueprint $table) {
                $table->dropColumn('batch_type');
            });
        }
    }
};
