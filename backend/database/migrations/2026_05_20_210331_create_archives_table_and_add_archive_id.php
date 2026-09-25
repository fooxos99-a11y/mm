<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('archives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::table('students', function (Blueprint $table) {
            $table->foreignUuid('archive_id')->nullable()->constrained('archives')->nullOnDelete();
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->foreignUuid('archive_id')->nullable()->constrained('archives')->nullOnDelete();
        });

        Schema::table('reciters', function (Blueprint $table) {
            $table->foreignUuid('archive_id')->nullable()->constrained('archives')->nullOnDelete();
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->foreignUuid('archive_id')->nullable()->constrained('archives')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropForeign(['archive_id']);
            $table->dropColumn('archive_id');
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->dropForeign(['archive_id']);
            $table->dropColumn('archive_id');
        });

        Schema::table('reciters', function (Blueprint $table) {
            $table->dropForeign(['archive_id']);
            $table->dropColumn('archive_id');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['archive_id']);
            $table->dropColumn('archive_id');
        });

        Schema::dropIfExists('archives');
    }
};
