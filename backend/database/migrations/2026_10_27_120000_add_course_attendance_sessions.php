<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('attendance_sessions')) {
            Schema::create('attendance_sessions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('department_id')->constrained('departments');
                $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
                $table->decimal('hours', 8, 2);
                $table->timestamp('opened_at');
                $table->timestamp('closed_at')->nullable();
                // NULL permits historical sessions; only one active marker per course.
                $table->unsignedTinyInteger('active')->nullable();
                $table->foreignUuid('opened_by')->nullable()->constrained('users')->nullOnDelete();
                $table->unique(['course_id', 'active']);
            });
        }
        // MySQL may use the old unique index to support the course foreign key.
        if (! Schema::hasIndex('course_attendance', 'attendance_course_lookup')) {
            Schema::table('course_attendance', fn (Blueprint $table) => $table->index('course_id', 'attendance_course_lookup'));
        }
        if (Schema::hasIndex('course_attendance', 'course_attendance_course_id_login_code_source_unique')) {
            Schema::table('course_attendance', fn (Blueprint $table) => $table->dropUnique(['course_id', 'login_code', 'source']));
        }
        if (! Schema::hasColumn('course_attendance', 'session_id')) {
            Schema::table('course_attendance', function (Blueprint $table) {
                $table->foreignUuid('session_id')->nullable()->constrained('attendance_sessions');
                $table->decimal('hours', 8, 2)->nullable();
                $table->unique(['session_id', 'student_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('course_attendance', function (Blueprint $table) {
            $table->dropForeign(['session_id']);
            $table->dropUnique(['session_id', 'student_id']);
            $table->dropColumn(['session_id', 'hours']);
        });
        Schema::dropIfExists('attendance_sessions');
    }
};
