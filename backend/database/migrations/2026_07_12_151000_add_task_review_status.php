<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_submissions', function (Blueprint $table) {
            $table->string('task_review_status', 20)->nullable()->after('manual_score');
            $table->foreignUuid('task_reviewed_by')
                ->nullable()
                ->after('task_review_status')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('task_reviewed_at')->nullable()->after('task_reviewed_by');
            $table->index(['assessment_type', 'task_review_status']);
        });

        DB::table('course_submissions')
            ->where('assessment_type', 'tasks')
            ->whereNull('task_review_status')
            ->update([
                'task_review_status' => DB::raw(
                    "case when manual_score is null then 'pending' when manual_score > 0 then 'approved' else "
                        ."'rejected' end"
                ),
            ]);
    }

    public function down(): void
    {
        Schema::table('course_submissions', function (Blueprint $table) {
            $table->dropIndex(['assessment_type', 'task_review_status']);
            $table->dropForeign(['task_reviewed_by']);
            $table->dropColumn(['task_review_status', 'task_reviewed_by', 'task_reviewed_at']);
        });
    }
};
