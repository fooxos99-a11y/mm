<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_import_batches', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('department_id')->constrained('departments');
            $table->string('source_hash', 64);
            $table->string('payload_hash', 64);
            $table->string('branch_code', 100);
            $table->unsignedInteger('record_count');
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at');
            $table->unique(['department_id', 'source_hash']);
        });
        Schema::create('student_import_items', function (Blueprint $table): void {
            $table->foreignUuid('batch_id')->constrained('student_import_batches');
            $table->foreignUuid('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('registration_id')->nullable()->constrained('registration_requests')->nullOnDelete();
            $table->unsignedInteger('source_row');
            $table->primary(['batch_id', 'source_row']);
        });
        Schema::create('student_initial_credentials', function (Blueprint $table): void {
            $table->foreignUuid('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->text('encrypted_password');
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_initial_credentials');
        Schema::dropIfExists('student_import_items');
        Schema::dropIfExists('student_import_batches');
    }
};
