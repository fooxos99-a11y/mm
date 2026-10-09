<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SatisfactionTemplateService
{
    public function register(string $prompt, string $type, bool $required): Collection
    {
        return DB::transaction(function () use ($prompt, $type, $required): Collection {
            $key = hash('sha256', json_encode([trim($prompt), $type], JSON_UNESCAPED_UNICODE));
            DB::table('satisfaction_templates')->insertOrIgnore([
                'id' => (string) str()->uuid(), 'identity_key' => $key,
                'prompt' => trim($prompt), 'type' => $type, 'is_required' => $required, 'created_at' => now(),
            ]);
            $template = DB::table('satisfaction_templates')->where('identity_key', $key)->lockForUpdate()->first();
            $courses = DB::table('courses')->whereNull('archive_id')->where('entity_type', '!=', 'task')->get();

            return $courses->map(fn ($course) => $this->attach($template, $course->id));
        });
    }

    public function inherit(string $courseId): void
    {
        foreach (DB::table('satisfaction_templates')->orderBy('created_at')->lockForUpdate()->get() as $template) {
            $this->attach($template, $courseId);
        }
    }

    public function restoreLegacyGlobals(): void
    {
        // The old "all courses" operation inserted its copies with one timestamp.
        // Single-course questions cannot be identified as global and stay local.
        $groups = DB::table('satisfaction_questions')->whereNull('archive_id')
            ->when(Schema::hasColumn('satisfaction_questions', 'deleted_at'), fn ($query) => $query->whereNull('deleted_at'))
            ->whereNull('global_template_id')->get()
            ->groupBy(fn ($question) => json_encode([
                $question->prompt, $question->type, (bool) $question->is_required, $question->created_at,
            ]));

        foreach ($groups as $questions) {
            if ($questions->pluck('course_id')->filter()->unique()->count() > 1) {
                $question = $questions->first();
                $this->register($question->prompt, $question->type, (bool) $question->is_required);
            }
        }
    }

    private function attach(object $template, string $courseId): object
    {
        $query = DB::table('satisfaction_questions')->whereNull('archive_id')->where('course_id', $courseId)
            ->when(Schema::hasColumn('satisfaction_questions', 'deleted_at'), fn ($query) => $query->whereNull('deleted_at'));
        $existing = (clone $query)->where('prompt', $template->prompt)->where('type', $template->type)
            ->orderBy('sort_order')->first();
        if ($existing) {
            if ($existing->global_template_id === null) {
                DB::table('satisfaction_questions')->where('id', $existing->id)
                    ->update(['global_template_id' => $template->id]);
            }

            return $existing;
        }

        DB::table('satisfaction_questions')->insertOrIgnore([
            'id' => (string) str()->uuid(), 'course_id' => $courseId, 'global_template_id' => $template->id,
            'prompt' => $template->prompt, 'type' => $template->type, 'is_required' => $template->is_required,
            'sort_order' => ((int) $query->max('sort_order')) + 1, 'created_at' => now(),
        ]);

        return $query->where('global_template_id', $template->id)->first();
    }
}
