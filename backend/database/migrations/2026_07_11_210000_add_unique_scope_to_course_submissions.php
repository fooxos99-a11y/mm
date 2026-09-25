<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX_NAME = 'course_submission_once_per_scope_unique';

    public function up(): void
    {
        Schema::table('course_submissions', function (Blueprint $table) {
            $table->string('submission_uniqueness_scope', 64)->default('active')->after('archive_id');
        });

        DB::table('course_submissions')
            ->orderBy('submitted_at')
            ->orderBy('id')
            ->select(['id', 'archive_id'])
            ->chunk(500, function ($submissions): void {
                foreach ($submissions as $submission) {
                    DB::table('course_submissions')
                        ->where('id', $submission->id)
                        ->update([
                            'submission_uniqueness_scope' => $submission->archive_id ?: 'active',
                        ]);
                }
            });

        $duplicateGroups = DB::table('course_submissions')
            ->select([
                'course_id',
                'assessment_type',
                'login_code',
                'submission_uniqueness_scope',
                DB::raw('count(*) as duplicates_count'),
            ])
            ->groupBy('course_id', 'assessment_type', 'login_code', 'submission_uniqueness_scope')
            ->having('duplicates_count', '>', 1)
            ->get();

        foreach ($duplicateGroups as $group) {
            DB::table('course_submissions')
                ->where('course_id', $group->course_id)
                ->where('assessment_type', $group->assessment_type)
                ->where('login_code', $group->login_code)
                ->where('submission_uniqueness_scope', $group->submission_uniqueness_scope)
                ->orderByDesc('submitted_at')
                ->orderBy('id')
                ->skip(1)
                ->pluck('id')
                ->each(function (string $id): void {
                    DB::table('course_submissions')
                        ->where('id', $id)
                        ->update(['submission_uniqueness_scope' => 'legacy-'.$id]);
                });
        }

        Schema::table('course_submissions', function (Blueprint $table) {
            $table->unique(
                ['course_id', 'assessment_type', 'login_code', 'submission_uniqueness_scope'],
                self::INDEX_NAME,
            );
        });
    }

    public function down(): void
    {
        Schema::table('course_submissions', function (Blueprint $table) {
            $table->dropUnique(self::INDEX_NAME);
            $table->dropColumn('submission_uniqueness_scope');
        });
    }
};
