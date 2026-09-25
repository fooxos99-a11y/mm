<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('completion_requirement_settings', function (Blueprint $table) {
            $table->string('branch_code')->primary();
            $table->unsignedSmallInteger('attendance_required')->default(10);
            $table->unsignedTinyInteger('tasks_percentage_required')->default(80);
            $table->unsignedTinyInteger('final_exam_percentage_required')->default(70);
            $table->unsignedTinyInteger('quran_parts_required');
            $table->boolean('is_closed')->default(false);
            $table->foreignUuid('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('student_completion_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('branch_code');
            $table->string('status', 20);
            $table->json('requirements_snapshot');
            $table->json('details');
            $table->foreignUuid('finalized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('finalized_at');
            $table->timestamps();
            $table->unique('student_id');
            $table->index(['branch_code', 'status']);
        });

        foreach (['male' => 30, 'female' => 10] as $branchCode => $partsRequired) {
            DB::table('completion_requirement_settings')->insert([
                'branch_code' => $branchCode,
                'attendance_required' => 10,
                'tasks_percentage_required' => 80,
                'final_exam_percentage_required' => 70,
                'quran_parts_required' => $partsRequired,
                'is_closed' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (Schema::hasTable('app_settings')) {
            $content = DB::table('app_settings')->where('setting_key', 'practitioner_page_content')->value('value');
            if (is_string($content) && $content !== '') {
                DB::table('app_settings')->where('setting_key', 'practitioner_page_content')->update([
                    'value' => str_replace(
                        ['عرض (15) جزءًا', '(14) جزءًا قراءةً'],
                        ['عرض (10) أجزاء', '(9) أجزاء قراءةً'],
                        $content,
                    ),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('student_completion_results');
        Schema::dropIfExists('completion_requirement_settings');
    }
};
