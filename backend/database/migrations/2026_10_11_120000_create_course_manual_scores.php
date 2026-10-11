<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_score_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('assessment_type', 10);
            $table->string('branch_code', 10);
            $table->decimal('total_points', 10, 2);
            $table->unique(['course_id', 'assessment_type', 'branch_code'], 'course_score_scope_unique');
        });
        Schema::create('course_manual_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('setting_id')->constrained('course_score_settings')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->decimal('score', 10, 2)->nullable();
            $table->uuid('version');
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['setting_id', 'student_id']);
        });
        Schema::create('course_score_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('score_id')->constrained('course_manual_scores')->cascadeOnDelete();
            $table->decimal('previous_score', 10, 2)->nullable();
            $table->decimal('new_score', 10, 2)->nullable();
            $table->foreignUuid('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_score_history');
        Schema::dropIfExists('course_manual_scores');
        Schema::dropIfExists('course_score_settings');
    }
};
