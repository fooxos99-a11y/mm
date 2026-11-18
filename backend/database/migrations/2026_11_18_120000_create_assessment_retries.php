<?php

use App\Support\DepartmentContext;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_retries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('department_id')->default(DepartmentContext::DEFAULT_ID)
                ->constrained('departments')->restrictOnDelete();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('assessment_type', 16);
            $table->unique(['department_id', 'course_id', 'student_id', 'assessment_type'], 'assessment_retries_scope_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_retries');
    }
};
