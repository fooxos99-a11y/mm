<?php

namespace App\Services\Concerns;

use App\Models\Archive;
use App\Models\Branch;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

trait ArchivesActiveBatch
{
    public function create(array $data): Archive
    {
        return Archive::create([
            'name' => trim($data['name']),
            'courses_count' => $data['courses_count'],
            'batch_type' => $data['batch_type'],
        ]);
    }

    public function assignStudent(string $archiveId, array $data): Student
    {
        Archive::findOrFail($archiveId);
        $branch = Branch::query()->where('code', 'male')->first() ?? Branch::query()->orderBy('created_at')->first();
        abort_unless($branch, 422, 'لا يوجد فرع صالح لإضافة الطالب المؤرشف.');

        return Student::query()->create([
            'full_name' => trim($data['name']),
            'login_code' => $this->generateArchivedLoginCode(),
            'branch_id' => $branch->id,
            'note' => 'أضيف يدويًا داخل الأرشيف',
            'is_certified' => false,
            'created_at' => now(),
            'archive_id' => $archiveId,
        ]);
    }

    public function archiveAll(array $data): Archive
    {
        $archive = null;
        $batchType = $data['batch_type'] ?? 'all';
        $hasSubmissionScope = Schema::hasColumn('course_submissions', 'submission_uniqueness_scope');

        DB::transaction(function () use (&$archive, $data, $batchType, $hasSubmissionScope): void {
            $archive = Archive::create(['name' => trim($data['name']), 'batch_type' => $batchType]);
            $archiveId = $archive->id;
            $activeStudents = DB::table('students')->whereNull('archive_id')
                ->when($batchType !== 'all', fn ($query) => $query
                    ->join('branches', 'branches.id', '=', 'students.branch_id')
                    ->where('branches.code', $batchType))
                ->select(['students.id', 'students.login_code'])->orderBy('students.created_at')->get();
            $studentIds = $activeStudents->pluck('id')->values();
            $studentLoginCodes = $activeStudents->pluck('login_code')->filter()->values();
            $activeCourses = DB::table('courses')->whereNull('archive_id')->get();
            $courseIds = $activeCourses->pluck('id')->values();
            $courseSubmissions = DB::table('course_submissions')->whereNull('archive_id')
                ->whereIn('course_id', $courseIds)->whereIn('login_code', $studentLoginCodes)->get();
            $courseSubmissionIds = $courseSubmissions->pluck('id')->values();
            $finalExamSubmissions = DB::table('final_exam_submissions')->whereNull('archive_id')
                ->whereIn('login_code', $studentLoginCodes)->get();
            $finalExamSubmissionIds = $finalExamSubmissions->pluck('id')->values();

            $courseIdMap = [];
            foreach ($activeCourses as $course) {
                $newCourseId = (string) Str::uuid();
                $courseIdMap[$course->id] = $newCourseId;
                $payload = (array) $course;
                $payload['id'] = $newCourseId;
                $payload['archive_id'] = $archiveId;
                DB::table('courses')->insert($payload);
            }

            $courseQuestionIdMap = [];
            $activeCourseQuestions = DB::table('course_questions')
                ->whereNull('archive_id')
                ->whereIn('course_id', $courseIds)
                ->get();
            foreach ($activeCourseQuestions as $question) {
                $newQuestionId = (string) Str::uuid();
                $courseQuestionIdMap[$question->id] = $newQuestionId;
                $payload = (array) $question;
                $payload['id'] = $newQuestionId;
                $payload['course_id'] = $courseIdMap[$question->course_id];
                $payload['archive_id'] = $archiveId;
                DB::table('course_questions')->insert($payload);
            }

            $satisfactionQuestionIdMap = [];
            $activeSatisfactionQuestions = DB::table('satisfaction_questions')->whereNull('archive_id')->get();
            foreach ($activeSatisfactionQuestions as $question) {
                $newQuestionId = (string) Str::uuid();
                $satisfactionQuestionIdMap[$question->id] = $newQuestionId;
                $payload = (array) $question;
                $payload['id'] = $newQuestionId;
                $payload['course_id'] = $question->course_id
                    ? ($courseIdMap[$question->course_id] ?? $question->course_id)
                    : null;
                $payload['archive_id'] = $archiveId;
                DB::table('satisfaction_questions')->insert($payload);
            }

            $finalQuestionIdMap = [];
            $activeFinalQuestions = DB::table('final_exam_questions')->whereNull('archive_id')->get();
            foreach ($activeFinalQuestions as $question) {
                $newQuestionId = (string) Str::uuid();
                $finalQuestionIdMap[$question->id] = $newQuestionId;
                $payload = (array) $question;
                $payload['id'] = $newQuestionId;
                $payload['archive_id'] = $archiveId;
                DB::table('final_exam_questions')->insert($payload);
            }

            $archivedLoginCodes = [];
            foreach ($activeStudents as $student) {
                $originalLoginCode = trim((string) $student->login_code);
                $archivedLoginCode = $this->generateArchivedLoginCode();
                $archivedLoginCodes[$originalLoginCode] = $archivedLoginCode;
                DB::table('students')->where('id', $student->id)->update([
                    'archive_id' => $archiveId,
                    'archived_login_code' => $originalLoginCode !== '' ? $originalLoginCode : null,
                    'login_code' => $archivedLoginCode,
                ]);
            }

            foreach ($courseSubmissions as $submission) {
                $payload = [
                    'course_id' => $courseIdMap[$submission->course_id] ?? $submission->course_id,
                    'login_code' => $archivedLoginCodes[$submission->login_code] ?? $submission->login_code,
                    'archive_id' => $archiveId,
                ];
                if ($hasSubmissionScope) {
                    $payload['submission_uniqueness_scope'] = $archiveId;
                }
                DB::table('course_submissions')->where('id', $submission->id)->update($payload);
            }

            $courseSubmissionAnswers = DB::table('course_submission_answers')->whereNull('archive_id')
                ->whereIn('submission_id', $courseSubmissionIds)->get();
            foreach ($courseSubmissionAnswers as $answer) {
                DB::table('course_submission_answers')->where('id', $answer->id)->update([
                    'question_id' => $courseQuestionIdMap[$answer->question_id] ?? $answer->question_id,
                    'archive_id' => $archiveId,
                ]);
            }

            $attendanceRecords = DB::table('course_attendance')->whereNull('archive_id')
                ->whereIn('login_code', $studentLoginCodes)->get();
            foreach ($attendanceRecords as $attendance) {
                DB::table('course_attendance')->where('id', $attendance->id)->update([
                    'course_id' => $courseIdMap[$attendance->course_id] ?? $attendance->course_id,
                    'login_code' => $archivedLoginCodes[$attendance->login_code] ?? $attendance->login_code,
                    'archive_id' => $archiveId,
                ]);
            }

            $satisfactionResponses = DB::table('satisfaction_responses')->whereNull('archive_id')
                ->whereIn('login_code', $studentLoginCodes)->get();
            foreach ($satisfactionResponses as $response) {
                DB::table('satisfaction_responses')->where('id', $response->id)->update([
                    'course_id' => $courseIdMap[$response->course_id] ?? $response->course_id,
                    'question_id' => $satisfactionQuestionIdMap[$response->question_id] ?? $response->question_id,
                    'login_code' => $archivedLoginCodes[$response->login_code] ?? $response->login_code,
                    'archive_id' => $archiveId,
                ]);
            }

            foreach ($finalExamSubmissions as $submission) {
                DB::table('final_exam_submissions')->where('id', $submission->id)->update([
                    'login_code' => $archivedLoginCodes[$submission->login_code] ?? $submission->login_code,
                    'archive_id' => $archiveId,
                ]);
            }

            $finalExamAnswers = DB::table('final_exam_submission_answers')->whereNull('archive_id')
                ->whereIn('submission_id', $finalExamSubmissionIds)->get();
            foreach ($finalExamAnswers as $answer) {
                DB::table('final_exam_submission_answers')->where('id', $answer->id)->update([
                    'question_id' => $finalQuestionIdMap[$answer->question_id] ?? $answer->question_id,
                    'archive_id' => $archiveId,
                ]);
            }

            DB::table('reciter_students')->whereIn('student_id', $studentIds)->delete();
            DB::table('push_subscriptions')->whereIn('login_code', $studentLoginCodes)->delete();
            if ($studentLoginCodes->isNotEmpty()) {
                $studentUserIds = DB::table('users')->where('role', 'student')
                    ->whereIn('login_code', $studentLoginCodes)->pluck('id');
                DB::table('sessions')->whereIn('user_id', $studentUserIds)->delete();
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', User::class)
                    ->whereIn('tokenable_id', $studentUserIds)->delete();
                DB::table('users')->where('role', 'student')->whereIn('login_code', $studentLoginCodes)->delete();
            }
            if (Schema::hasTable('completion_requirement_settings')) {
                DB::table('completion_requirement_settings')->update([
                    'is_closed' => false,
                    'closed_by' => null,
                    'closed_at' => null,
                    'updated_at' => now(),
                ]);
            }
            $this->clearDashboardCache();
        });

        return $archive;
    }

    private function generateArchivedLoginCode(): string
    {
        do {
            $loginCode = 'archive-'.strtolower(substr(str_replace('-', '', (string) str()->uuid()), 0, 10));
        } while (Student::query()->where('login_code', $loginCode)->exists()
            || DB::table('users')->where('login_code', $loginCode)->exists());

        return $loginCode;
    }

    private function clearDashboardCache(): void
    {
        cache()->forget('dashboard:snapshot');
        cache()->forget('dashboard:notifications');
    }
}
