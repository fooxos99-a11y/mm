<?php

namespace Tests\Feature;

use App\Services\CourseAssessmentService;
use App\Services\CourseManagementService;
use App\Services\FinalExamService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;

class AssessmentAttachmentRollbackTest extends CoreDataApiTestCase
{
    public static function types(): array
    {
        return [['pre'], ['post'], ['tasks'], ['final']];
    }

    #[DataProvider('types')]
    public function test_failed_submission_removes_files_written_before_the_rollback(string $type): void
    {
        Storage::fake('local');
        $question = ['prompt' => 'Attachment', 'type' => 'text', 'options' => [],
            'allowFile' => true, 'correctAnswer' => '', 'points' => 1];
        $payload = ['studentName' => 'Rollback', 'loginCode' => 'rollback-final', 'loginId' => 'rollback-course', 'branchCode' => 'male'];
        $courseId = '';
        if ($type === 'final') {
            $service = app(FinalExamService::class);
            $ids = [$service->addFinalExamQuestion('male', $question)['id'], $service->addFinalExamQuestion('male', $question)['id']];
            $service->updateFinalExamSetting('male', true, now()->addHour()->toISOString());
        } else {
            $manager = app(CourseManagementService::class);
            $courseId = $manager->createCourse('Rollback files', true)['id'];
            DB::table('courses')->where('id', $courseId)->update(['is_tasks_enabled' => true]);
            $ids = [$manager->addCourseQuestion($courseId, $type, $question), $manager->addCourseQuestion($courseId, $type, $question)];
        }
        $payload['answers'] = [
            ['questionId' => $ids[0], 'file' => UploadedFile::fake()->createWithContent('answer.pdf', "%PDF-1.4\n%%EOF")],
            ['questionId' => $ids[1], 'fileType' => 'application/pdf', 'fileDataUrl' => 'data:application/pdf;base64,%%%'],
        ];
        try {
            if ($type === 'final') {
                app(FinalExamService::class)->submitFinalExam($payload);
            } else {
                app(CourseAssessmentService::class)->submitAssessment($courseId, $type, $payload);
            }
            $this->fail('The invalid second attachment must reject the transaction.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('answers', $exception->errors());
        }
        $this->assertDatabaseCount($type === 'final' ? 'final_exam_submissions' : 'course_submissions', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }
}
