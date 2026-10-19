<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COUNTS = ['tasks_count', 'male_teachers_count', 'female_teachers_count', 'completed_parts_count'];

    public function up(): void
    {
        $missing = array_values(array_filter(self::COUNTS, fn ($column) => ! Schema::hasColumn('archives', $column)));
        if ($missing === []) {
            return;
        }
        Schema::table('archives', function (Blueprint $table) use ($missing): void {
            foreach ($missing as $column) {
                $table->unsignedInteger($column)->default(0);
            }
        });

        // Populate only newly added fields from each archive's own records. Preserve historical manual course totals.
        DB::table('archives')->orderBy('id')->chunkById(100, function ($archives) use ($missing): void {
            foreach ($archives as $archive) {
                $students = DB::table('students')->join('branches', 'branches.id', '=', 'students.branch_id')
                    ->where('students.archive_id', $archive->id)->where('students.department_id', $archive->department_id);
                $courses = DB::table('courses')->where('archive_id', $archive->id)->where('department_id', $archive->department_id);
                $counts = [
                    'tasks_count' => (clone $courses)->where('entity_type', 'task')->count(),
                    'male_teachers_count' => (clone $students)->where('branches.code', 'male')->count(),
                    'female_teachers_count' => (clone $students)->where('branches.code', 'female')->count(),
                    'completed_parts_count' => DB::table('student_parts')->where('department_id', $archive->department_id)
                        ->whereIn('student_id', (clone $students)->select('students.id'))->count(),
                ];
                $update = array_intersect_key($counts, array_flip($missing));
                if ((int) $archive->courses_count === 0) {
                    $update['courses_count'] = (clone $courses)->where('entity_type', '!=', 'task')->count();
                }
                DB::table('archives')->where('id', $archive->id)->update($update);
            }
        });
    }

    public function down(): void
    {
        $columns = array_values(array_filter(self::COUNTS, fn ($column) => Schema::hasColumn('archives', $column)));
        if ($columns !== []) {
            Schema::table('archives', fn (Blueprint $table) => $table->dropColumn($columns));
        }
    }
};
