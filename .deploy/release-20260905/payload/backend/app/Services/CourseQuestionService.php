<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CourseQuestionService
{
    public function __construct(private readonly AssessmentAttachmentService $assessmentAttachmentService) {}

    public function create(string $courseId, string $assessmentType, array $question): string
    {
        if (! in_array($assessmentType, ['pre', 'post', 'tasks'], true)) {
            throw ValidationException::withMessages(['assessmentType' => ['نوع التقييم غير صالح.']]);
        }

        $course = DB::table('courses')->where('id', $courseId)->first();
        if (! $course) {
            throw ValidationException::withMessages(['courseId' => ['الدورة المحددة غير موجودة.']]);
        }

        $this->assertMutable($courseId, $assessmentType, $course->archive_id ?? null);
        $questionId = (string) str()->uuid();
        $type = ($question['type'] ?? 'multiple') === 'truefalse' ? 'multiple' : ($question['type'] ?? 'multiple');
        $options = ($question['type'] ?? 'multiple') === 'truefalse' ? ['صح', 'خطأ'] : ($question['options'] ?? []);
        $sortOrder = (int) DB::table('course_questions')
            ->where('course_id', $courseId)
            ->where('assessment_type', $assessmentType)
            ->when(
                $course->archive_id ?? null,
                fn ($query, $archiveId) => $query->where('archive_id', $archiveId),
                fn ($query) => $query->whereNull('archive_id'),
            )
            ->count();

        DB::table('course_questions')->insert([
            'id' => $questionId,
            'course_id' => $courseId,
            'assessment_type' => $assessmentType,
            ...$this->attributes($question, $type, $options),
            'sort_order' => $sortOrder,
            'created_at' => now(),
        ]);

        return $questionId;
    }

    public function update(string $questionId, array $question): void
    {
        $existing = DB::table('course_questions')->where('id', $questionId)->first();
        if (! $existing) {
            throw ValidationException::withMessages(['questionId' => ['السؤال المحدد غير موجود.']]);
        }

        $this->assertMutable(
            (string) $existing->course_id,
            (string) $existing->assessment_type,
            $existing->archive_id ?? null,
        );

        $type = ($question['type'] ?? 'multiple') === 'truefalse' ? 'multiple' : ($question['type'] ?? 'multiple');
        $options = ($question['type'] ?? 'multiple') === 'truefalse' ? ['صح', 'خطأ'] : ($question['options'] ?? []);

        DB::table('course_questions')->where('id', $questionId)->update(
            $this->attributes($question, $type, $options),
        );
    }

    public function delete(string $questionId): void
    {
        $question = DB::table('course_questions')->where('id', $questionId)->first();
        if (! $question) {
            throw ValidationException::withMessages(['questionId' => ['السؤال المحدد غير موجود.']]);
        }

        $this->assertMutable(
            (string) $question->course_id,
            (string) $question->assessment_type,
            $question->archive_id ?? null,
        );

        DB::table('course_questions')->where('id', $questionId)->delete();
    }

    private function attributes(array $question, string $type, array $options): array
    {
        $legacyAttachment = trim((string) ($question['attachmentDataUrl'] ?? ''));
        $attachmentPath = null;

        if (str_starts_with(strtolower($legacyAttachment), 'data:')) {
            $stored = $this->assessmentAttachmentService->storeAnswer([
                'fileName' => $question['attachmentName'] ?? null,
                'fileType' => $question['attachmentType'] ?? null,
                'fileDataUrl' => $legacyAttachment,
            ]);
            $attachmentPath = $stored['file_path'];
            $legacyAttachment = '';
        }

        return [
            'question_type' => $type,
            'prompt' => trim((string) $question['prompt']),
            'options' => json_encode($options, JSON_UNESCAPED_UNICODE),
            'allow_file' => (bool) ($question['allowFile'] ?? false),
            'points' => (int) ($question['points'] ?? 1),
            'correct_answer' => $question['correctAnswer'] ?? '',
            'attachment_name' => $question['attachmentName'] ?? '',
            'attachment_type' => $question['attachmentType'] ?? '',
            'attachment_path' => $attachmentPath,
            'attachment_data_url' => $legacyAttachment,
        ];
    }

    private function assertMutable(string $courseId, string $assessmentType, ?string $archiveId): void
    {
        $hasSubmissions = DB::table('course_submissions')
            ->where('course_id', $courseId)
            ->where('assessment_type', $assessmentType)
            ->when(
                $archiveId,
                fn ($query, $resolvedArchiveId) => $query->where('archive_id', $resolvedArchiveId),
                fn ($query) => $query->whereNull('archive_id'),
            )
            ->exists();

        if ($hasSubmissions) {
            throw ValidationException::withMessages([
                'questionId' => ['لا يمكن تعديل أسئلة التقييم بعد وجود إجابات.'],
            ]);
        }
    }
}
