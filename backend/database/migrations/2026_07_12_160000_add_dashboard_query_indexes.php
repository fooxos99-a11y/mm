<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->index(['archive_id', 'branch_id', 'created_at'], 'students_archive_branch_created_index');
        });

        Schema::table('course_attendance', function (Blueprint $table) {
            $table->index(['archive_id', 'login_code', 'course_id'], 'attendance_archive_login_course_index');
        });

        Schema::table('course_submissions', function (Blueprint $table) {
            $table->index(
                ['archive_id', 'assessment_type', 'task_review_status', 'course_id', 'login_code'],
                'submissions_completion_lookup_index',
            );
        });

        Schema::table('course_submission_answers', function (Blueprint $table) {
            $table->index(['archive_id', 'submission_id'], 'submission_answers_archive_submission_index');
        });

        Schema::table('final_exam_questions', function (Blueprint $table) {
            $table->index(['archive_id', 'branch_code', 'sort_order'], 'final_questions_archive_branch_sort_index');
        });

        Schema::table('final_exam_submissions', function (Blueprint $table) {
            $table->index(['archive_id', 'branch_code', 'login_code'], 'final_submissions_archive_branch_login_index');
        });

        Schema::table('final_exam_submission_answers', function (Blueprint $table) {
            $table->index(['archive_id', 'submission_id'], 'final_answers_archive_submission_index');
        });

        Schema::table('registration_requests', function (Blueprint $table) {
            $table->index(['branch_code', 'status', 'created_at'], 'registration_branch_status_created_index');
            $table->index(['gender', 'status', 'created_at'], 'registration_gender_status_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('registration_requests', function (Blueprint $table) {
            $table->dropIndex('registration_branch_status_created_index');
            $table->dropIndex('registration_gender_status_created_index');
        });

        Schema::table('final_exam_submission_answers', function (Blueprint $table) {
            $table->dropIndex('final_answers_archive_submission_index');
        });

        Schema::table('final_exam_submissions', function (Blueprint $table) {
            $table->dropIndex('final_submissions_archive_branch_login_index');
        });

        Schema::table('final_exam_questions', function (Blueprint $table) {
            $table->dropIndex('final_questions_archive_branch_sort_index');
        });

        Schema::table('course_submission_answers', function (Blueprint $table) {
            $table->dropIndex('submission_answers_archive_submission_index');
        });

        Schema::table('course_submissions', function (Blueprint $table) {
            $table->dropIndex('submissions_completion_lookup_index');
        });

        Schema::table('course_attendance', function (Blueprint $table) {
            $table->dropIndex('attendance_archive_login_course_index');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropIndex('students_archive_branch_created_index');
        });
    }
};
