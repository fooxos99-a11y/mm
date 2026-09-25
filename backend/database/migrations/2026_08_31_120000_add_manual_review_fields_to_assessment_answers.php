<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['course_submission_answers', 'final_exam_submission_answers'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->decimal('manual_points', 8, 2)->nullable();
                $table->uuid('reviewed_by')->nullable();
                $table->timestamp('reviewed_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['final_exam_submission_answers', 'course_submission_answers'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropColumn(['manual_points', 'reviewed_by', 'reviewed_at']);
            });
        }
    }
};
