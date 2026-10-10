<?php

use App\Services\SatisfactionTemplateService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('satisfaction_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('identity_key', 64)->unique();
            $table->text('prompt');
            $table->string('type');
            $table->boolean('is_required')->default(true);
            $table->timestamp('created_at')->useCurrent();
        });
        Schema::table('satisfaction_questions', function (Blueprint $table) {
            $table->foreignUuid('global_template_id')->nullable()->constrained('satisfaction_templates')->nullOnDelete();
            $table->unique(['course_id', 'global_template_id'], 'satisfaction_course_template_unique');
        });
        app(SatisfactionTemplateService::class)->restoreLegacyGlobals();
    }

    public function down(): void
    {
        // MySQL may replace the implicit course foreign-key index with the composite unique index.
        if (! Schema::hasIndex('satisfaction_questions', ['course_id'])) {
            Schema::table('satisfaction_questions', function (Blueprint $table) {
                $table->index('course_id', 'satisfaction_questions_course_id_index');
            });
        }

        Schema::table('satisfaction_questions', function (Blueprint $table) {
            $table->dropUnique('satisfaction_course_template_unique');
            $table->dropConstrainedForeignId('global_template_id');
        });
        Schema::dropIfExists('satisfaction_templates');
    }
};
