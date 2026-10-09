<?php

namespace App\Services\Concerns;

use App\Models\Student;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

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
        $storedPaths = [];

        try {
            DB::transaction(function () use (
                $submissionId,
                $submittedAt,
                $branchCode,
                $studentName,
                $submission,
                $loginCode,
                $questionSnapshots,
                &$storedPaths
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
                    ->map(function (array $answer) use ($submissionId, $questionSnapshots, &$storedPaths): array {
                        $question = $questionSnapshots->get(trim((string) $answer['questionId']));
                        $attachment = $this->assessmentAttachmentService->storeAnswer($answer);
                        if ($attachment['file_path']) {
                            $storedPaths[] = $attachment['file_path'];
                        }

                        return [
                            'id' => (string) str()->uuid(),
                            'submission_id' => $submissionId,
                            'question_id' => $answer['questionId'],
                            'answer_text' => $answer['value'] ?? null,
                            ...$attachment,
                            ...$this->submissionValidator->snapshotColumns($question),
                        ];
                    })
                    ->all();

                if ($answers !== []) {
                    DB::table('final_exam_submission_answers')->insert($answers);
                }
            });
        } catch (Throwable $exception) {
            foreach ($storedPaths as $path) {
                $this->assessmentAttachmentService->delete($path);
            }
            if (! $exception instanceof UniqueConstraintViolationException
                || ! DB::table('final_exam_submissions')->where('login_code', $loginCode)->exists()) {
                throw $exception;
            }
            throw ValidationException::withMessages(['loginCode' => 'تم إرسال الاختبار النهائي مسبقًا.']);
        }

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
