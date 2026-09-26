<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssessmentSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_answer_data_url_is_accepted_and_student_name_is_derived_from_account(): void
    {
        Storage::fake('local');
        [$user, $student] = $this->createStudentIdentity('male', 'student-attachment', 'Trusted Student');
        [$courseId, $questionId] = $this->createCourseQuestion(true);
        Sanctum::actingAs($user);

        $dataUrl = 'data:image/png;base64,'
            .'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

        $response = $this->postJson('/api/public/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'pre',
            'studentName' => 'Forged Student Name',
            'loginId' => $student->login_code,
            'answers' => [[
                'questionId' => $questionId,
                'value' => '',
                'fileName' => 'answer.png',
                'fileType' => 'image/png',
                'fileDataUrl' => $dataUrl,
            ]],
        ])->assertCreated();

        $this->assertDatabaseHas('course_submissions', [
            'id' => $response->json('id'),
            'student_name' => 'Trusted Student',
            'login_code' => $student->login_code,
        ]);
        $this->assertDatabaseHas('course_submission_answers', [
            'submission_id' => $response->json('id'),
            'question_id' => $questionId,
            'file_name' => 'answer.png',
            'file_type' => 'image/png',
            'file_data_url' => null,
        ]);

        $path = DB::table('course_submission_answers')
            ->where('submission_id', $response->json('id'))
            ->value('file_path');

        $this->assertNotEmpty($path);
        Storage::disk('local')->assertExists($path);
    }

    public function test_final_exam_submission_derives_branch_and_name_from_student_account(): void
    {
        [$user, $student] = $this->createStudentIdentity('male', 'student-final', 'Trusted Final Student');
        $questionId = $this->insertFinalExamQuestion('male', 'Trusted branch question');
        DB::table('final_exam_settings')->where('branch_code', 'male')->update([
            'is_enabled' => true,
            'closes_at' => now()->addHour(),
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/public/final-exam/submissions', [
            'branchCode' => 'female',
            'studentName' => 'Forged Final Name',
            'loginCode' => $student->login_code,
            'answers' => [[
                'questionId' => $questionId,
                'value' => 'answer',
            ]],
        ])->assertCreated();

        $this->assertDatabaseHas('final_exam_submissions', [
            'id' => $response->json('id'),
            'branch_code' => 'male',
            'student_name' => 'Trusted Final Student',
            'login_code' => $student->login_code,
        ]);
    }

    public function test_multipart_answer_file_is_stored_privately_instead_of_the_database(): void
    {
        Storage::fake('local');
        [$user, $student] = $this->createStudentIdentity('male', 'student-multipart', 'Multipart Student');
        [$courseId, $questionId] = $this->createCourseQuestion(true);
        Sanctum::actingAs($user);

        $response = $this->post('/api/public/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'pre',
            'studentName' => $student->full_name,
            'loginId' => $student->login_code,
            'answers' => [[
                'questionId' => $questionId,
                'value' => '',
                'fileName' => 'answer.pdf',
                'fileType' => 'application/pdf',
                'file' => UploadedFile::fake()->createWithContent('answer.pdf', "%PDF-1.4\n%%EOF"),
            ]],
        ], ['Accept' => 'application/json'])->assertCreated();

        $answer = DB::table('course_submission_answers')
            ->where('submission_id', $response->json('id'))
            ->first();

        $this->assertNotNull($answer);
        $this->assertNull($answer->file_data_url);
        $this->assertNotEmpty($answer->file_path);
        Storage::disk('local')->assertExists($answer->file_path);
    }

    /**
     * @return array{0: User, 1: Student}
     */
    private function createStudentIdentity(string $branchCode, string $loginCode, string $name): array
    {
        $user = User::factory()->create([
            'full_name' => $name,
            'role' => 'student',
            'login_code' => $loginCode,
        ]);
        $student = Student::query()->create([
            'full_name' => $name,
            'login_code' => $loginCode,
            'branch_id' => DB::table('branches')->where('code', $branchCode)->value('id'),
            'note' => '',
        ]);

        return [$user, $student];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function createCourseQuestion(bool $allowFile): array
    {
        $courseId = (string) Str::uuid();
        $questionId = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'Attachment course',
            'created_at' => now(),
        ]);
        DB::table('course_questions')->insert([
            'id' => $questionId,
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'question_type' => 'text',
            'prompt' => 'Upload an answer',
            'options' => json_encode([]),
            'allow_file' => $allowFile,
            'points' => 1,
            'correct_answer' => '',
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        return [$courseId, $questionId];
    }

    private function insertFinalExamQuestion(string $branchCode, string $prompt): string
    {
        $questionId = (string) Str::uuid();
        DB::table('final_exam_questions')->insert([
            'id' => $questionId,
            'branch_code' => $branchCode,
            'question_type' => 'text',
            'prompt' => $prompt,
            'options' => json_encode([]),
            'allow_file' => false,
            'points' => 1,
            'correct_answer' => 'answer',
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        return $questionId;
    }
}
