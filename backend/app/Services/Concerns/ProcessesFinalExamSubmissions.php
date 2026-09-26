<?php

namespace App\Services\Concerns;

use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait ProcessesFinalExamSubmissions
{
    public function submitFinalExam(array $submission): array
    {
        $loginCode = trim((string) $submission['loginCode']);
        [$branchCode, $studentName] = $this->resolveTrustedSubmissionIdentity($loginCode, $submission);
        $this->submissionValidator->assertOpen($branchCode);
        $questionSnapshots = $this->submissionValidator->questionSnapshots($submission['answers'] ?? [], $branchCode);

        if (DB::table('final_exam_submissions')->where('login_code', $loginCode)->exists()) {
            throw ValidationException::withMessages(['loginCode' => 'تم إرسال الاختبار النهائي مسبقًا.']);
        }

        $submissionId = (string) str()->uuid();
        $submittedAt = now();

        DB::transaction(function () use (
            $submissionId,
            $submittedAt,
            $branchCode,
            $studentName,
            $submission,
            $loginCode,
            $questionSnapshots
        ): void {
            DB::table('final_exam_submissions')->insert([
                'id' => $submissionId,
                'branch_code' => $branchCode,
                'student_name' => $studentName,
                'login_code' => $loginCode,
                'submitted_at' => $submittedAt,
            ]);

            $answers = collect($submission['answers'] ?? [])
                ->filter(fn (array $answer) => ($answer['questionId'] ?? '') !== '__score_override__')
                ->map(function (array $answer) use ($submissionId, $questionSnapshots): array {
                    $question = $questionSnapshots->get(trim((string) $answer['questionId']));

                    return [
                        'id' => (string) str()->uuid(),
                        'submission_id' => $submissionId,
                        'question_id' => $answer['questionId'],
                        'answer_text' => $answer['value'] ?? null,
                        ...$this->assessmentAttachmentService->storeAnswer($answer),
                        ...$this->submissionValidator->snapshotColumns($question),
                    ];
                })
                ->all();

            if ($answers !== []) {
                DB::table('final_exam_submission_answers')->insert($answers);
            }
        });

        return ['id' => $submissionId, 'submittedAt' => $submittedAt->toISOString()];
    }

    public function setFinalExamManualScore(string $submissionId, float|int|null $score): void
    {
        $branchCode = (string) DB::table('final_exam_submissions')->where('id', $submissionId)->value('branch_code');
        $this->assertCanManageBranch($branchCode);
        DB::table('final_exam_submissions')->where('id', $submissionId)->update(['manual_score' => $score]);
    }

    private function resolveTrustedSubmissionIdentity(string $loginCode, array $submission): array
    {
        $student = Student::query()->with('branch')->whereNull('archive_id')->where('login_code', $loginCode)->first();

        if ($student) {
            $branchCode = $this->normalizeBranchCode((string) $student->branch?->code);
            if (in_array($this->currentActorRole(), ['male_manager', 'female_manager'], true)) {
                $this->assertCanManageBranch($branchCode);
            }

            return [$branchCode, (string) $student->full_name];
        }

        if ($this->currentActorRole() === 'admin') {
            return [
                $this->normalizeBranchCode((string) ($submission['branchCode'] ?? '')),
                trim((string) ($submission['studentName'] ?? '')),
            ];
        }

        throw ValidationException::withMessages([
            'loginCode' => 'Unable to verify the student profile linked to this account.',
        ]);
    }
}
