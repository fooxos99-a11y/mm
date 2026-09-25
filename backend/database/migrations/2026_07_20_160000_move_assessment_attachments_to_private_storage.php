<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['course_questions', 'final_exam_questions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->string('attachment_path', 1024)->nullable();
            });
        }

        foreach (['course_submission_answers', 'final_exam_submission_answers'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->string('file_path', 1024)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['course_questions', 'final_exam_questions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropColumn('attachment_path');
            });
        }

        foreach (['course_submission_answers', 'final_exam_submission_answers'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropColumn('file_path');
            });
        }
    }
};
