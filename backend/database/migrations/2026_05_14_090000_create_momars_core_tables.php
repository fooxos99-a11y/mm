<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('name')->unique();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('students', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('login_code')->unique();
            $table->foreignUuid('branch_id')->constrained('branches')->restrictOnDelete();
            $table->text('note')->nullable();
            $table->boolean('is_certified')->default(false);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('reciters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->foreignUuid('user_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained('branches')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('reciter_students', function (Blueprint $table) {
            $table->foreignUuid('reciter_id')->constrained('reciters')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->primary(['reciter_id', 'student_id']);
        });

        Schema::create('student_parts', function (Blueprint $table) {
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->unsignedTinyInteger('part_number');
            $table->foreignUuid('marked_by_reciter_id')->nullable()->constrained('reciters')->nullOnDelete();
            $table->timestamp('marked_at')->useCurrent();
            $table->primary(['student_id', 'part_number']);
        });

        Schema::create('courses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('entity_type')->default('course');
            $table->string('task_mode')->nullable();
            $table->uuid('task_template_id')->nullable();
            $table->string('task_template_name')->default('');
            $table->longText('task_template_content')->nullable();
            $table->string('youtube_url')->default('');
            $table->boolean('is_active')->default(false);
            $table->boolean('is_pre_enabled')->default(true);
            $table->boolean('is_post_enabled')->default(true);
            $table->boolean('is_tasks_enabled')->default(true);
            $table->boolean('male_pre_enabled')->default(true);
            $table->boolean('female_pre_enabled')->default(true);
            $table->boolean('male_post_enabled')->default(true);
            $table->boolean('female_post_enabled')->default(true);
            $table->boolean('male_tasks_enabled')->default(true);
            $table->boolean('female_tasks_enabled')->default(true);
            $table->json('assessment_windows')->nullable();
            $table->json('assessment_notification_templates')->nullable();
            $table->integer('sort_order')->default(0);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('satisfaction_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->nullable()->constrained('courses')->cascadeOnDelete();
            $table->text('prompt');
            $table->string('type')->default('rating');
            $table->boolean('is_required')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('satisfaction_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('question_id')->constrained('satisfaction_questions')->cascadeOnDelete();
            $table->string('login_code');
            $table->string('student_name');
            $table->unsignedTinyInteger('rating_value')->nullable();
            $table->text('text_value')->nullable();
            $table->timestamp('submitted_at')->useCurrent();
            $table->unique(['course_id', 'question_id', 'login_code']);
        });

        Schema::create('final_exam_settings', function (Blueprint $table) {
            $table->string('branch_code')->primary();
            $table->boolean('is_enabled')->default(false);
            $table->timestamp('closes_at')->nullable();
            $table->text('notification_template')->nullable();
        });

        Schema::create('final_exam_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('branch_code');
            $table->string('question_type');
            $table->text('prompt');
            $table->json('options')->nullable();
            $table->boolean('allow_file')->default(false);
            $table->integer('points')->default(1);
            $table->text('correct_answer')->nullable();
            $table->string('attachment_name')->default('');
            $table->string('attachment_type')->default('');
            $table->longText('attachment_data_url')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('final_exam_submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('branch_code');
            $table->string('student_name');
            $table->string('login_code')->unique();
            $table->decimal('manual_score', 8, 2)->nullable();
            $table->timestamp('submitted_at')->useCurrent();
        });

        Schema::create('final_exam_submission_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('final_exam_submissions')->cascadeOnDelete();
            $table->foreignUuid('question_id')->constrained('final_exam_questions')->cascadeOnDelete();
            $table->text('answer_text')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_type')->nullable();
            $table->longText('file_data_url')->nullable();
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->string('role');
            $table->string('permission_key');
            $table->boolean('is_enabled')->default(true);
            $table->primary(['role', 'permission_key']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('message');
            $table->string('target_branch_code')->nullable();
            $table->json('target_login_ids')->nullable();
            $table->string('created_by_name')->nullable();
            $table->string('created_by_role')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('task_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->longText('content')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('course_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('assessment_type');
            $table->string('question_type');
            $table->text('prompt');
            $table->json('options')->nullable();
            $table->boolean('allow_file')->default(false);
            $table->integer('points')->default(1);
            $table->text('correct_answer')->nullable();
            $table->string('attachment_name')->default('');
            $table->string('attachment_type')->default('');
            $table->longText('attachment_data_url')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('course_submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('assessment_type');
            $table->foreignUuid('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->string('student_name');
            $table->string('login_code');
            $table->decimal('manual_score', 8, 2)->nullable();
            $table->timestamp('submitted_at')->useCurrent();
        });

        Schema::create('course_submission_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('course_submissions')->cascadeOnDelete();
            $table->foreignUuid('question_id')->constrained('course_questions')->cascadeOnDelete();
            $table->text('answer_text')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_type')->nullable();
            $table->longText('file_data_url')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('course_attendance', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->string('student_name');
            $table->string('login_code');
            $table->string('source')->default('post-test');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['course_id', 'login_code', 'source']);
        });

        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('login_code');
            $table->string('endpoint', 512);
            $table->text('p256dh');
            $table->text('auth');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['login_code', 'endpoint']);
        });

        DB::table('branches')->insert([
            [
                'id' => (string) Str::uuid(),
                'code' => 'male',
                'name' => 'معلمين',
                'created_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'code' => 'female',
                'name' => 'معلمات',
                'created_at' => now(),
            ],
        ]);

        DB::table('final_exam_settings')->insert([
            ['branch_code' => 'male', 'is_enabled' => false, 'notification_template' => ''],
            ['branch_code' => 'female', 'is_enabled' => false, 'notification_template' => ''],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
        Schema::dropIfExists('course_attendance');
        Schema::dropIfExists('course_submission_answers');
        Schema::dropIfExists('course_submissions');
        Schema::dropIfExists('course_questions');
        Schema::dropIfExists('task_templates');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('final_exam_submission_answers');
        Schema::dropIfExists('final_exam_submissions');
        Schema::dropIfExists('final_exam_questions');
        Schema::dropIfExists('final_exam_settings');
        Schema::dropIfExists('satisfaction_responses');
        Schema::dropIfExists('satisfaction_questions');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('student_parts');
        Schema::dropIfExists('reciter_students');
        Schema::dropIfExists('reciters');
        Schema::dropIfExists('students');
        Schema::dropIfExists('branches');
    }
};
