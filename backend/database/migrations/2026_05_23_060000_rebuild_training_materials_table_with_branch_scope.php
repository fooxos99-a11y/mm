<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('training_materials', 'target_branch_code')) {
            Schema::table('training_materials', function (Blueprint $table) {
                $table->string('target_branch_code')->nullable()->index()->after('description');
            });
        }
    }

    public function down(): void
    {
        // The target branch column is part of the base table definition now.
    }
};
