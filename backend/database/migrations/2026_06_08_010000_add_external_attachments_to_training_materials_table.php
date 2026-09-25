<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_materials', function (Blueprint $table) {
            $table->json('external_attachments')->nullable()->after('target_branch_code');
        });
    }

    public function down(): void
    {
        Schema::table('training_materials', function (Blueprint $table) {
            $table->dropColumn('external_attachments');
        });
    }
};
