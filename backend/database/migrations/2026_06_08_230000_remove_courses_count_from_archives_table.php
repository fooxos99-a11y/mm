<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('archives') && Schema::hasColumn('archives', 'courses_count')) {
            Schema::table('archives', function (Blueprint $table) {
                $table->dropColumn('courses_count');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('archives') && ! Schema::hasColumn('archives', 'courses_count')) {
            Schema::table('archives', function (Blueprint $table) {
                $table->unsignedInteger('courses_count')->default(0)->after('name');
            });
        }
    }
};
