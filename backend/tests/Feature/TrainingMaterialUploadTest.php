<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

class TrainingMaterialUploadTest extends CoreDataApiTestCase
{
    public function test_file_at_100_mib_is_accepted(): void
    {
        Storage::fake('local');
        $this->assertSame(100 * 1024 * 1024, config('media-library.max_file_size'));
        $this->post('/api/dashboard/training-materials', $this->payload(
            UploadedFile::fake()->create('guide.pdf', 102400, 'application/pdf'),
        ), ['Accept' => 'application/json'])->assertCreated();
    }

    public function test_larger_file_is_rejected_in_arabic_without_saving(): void
    {
        $response = $this->post('/api/dashboard/training-materials', $this->payload(
            UploadedFile::fake()->create('guide.pdf', 102401, 'application/pdf'),
        ), ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertSame('حجم الملف يتجاوز 100 ميجابايت. اختر ملفًا أصغر.', $response->json('errors')['attachments.0.file'][0]);
        $this->assertDatabaseCount('training_materials', 0);
    }

    public function test_php_upload_failures_report_the_actual_reason_in_arabic(): void
    {
        foreach ([
            UPLOAD_ERR_INI_SIZE => 'حد الرفع المضبوط في الخادم',
            UPLOAD_ERR_PARTIAL => 'لم يصل الملف كاملًا',
            UPLOAD_ERR_NO_TMP_DIR => 'مجلد التخزين المؤقت',
            UPLOAD_ERR_CANT_WRITE => 'تعذر كتابة الملف',
            UPLOAD_ERR_EXTENSION => 'إضافات الخادم',
        ] as $code => $reason) {
            $response = $this->post('/api/dashboard/training-materials', $this->payload(
                new UploadedFile('', 'guide.pdf', 'application/pdf', $code, true),
            ), ['Accept' => 'application/json'])->assertUnprocessable();
            $this->assertStringContainsString($reason, $response->json('errors')['attachments.0.file'][0]);
        }
        $this->assertDatabaseCount('training_materials', 0);
    }

    public function test_unsupported_file_is_rejected_in_arabic(): void
    {
        $response = $this->post('/api/dashboard/training-materials', $this->payload(
            UploadedFile::fake()->create('program.exe', 1, 'application/x-msdownload'),
        ), ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertStringContainsString('نوع الملف غير مدعوم', $response->json('errors')['attachments.0.file'][0]);
    }

    public function test_student_cannot_upload_training_materials(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'student']));
        $this->post('/api/dashboard/training-materials', $this->payload(
            UploadedFile::fake()->create('guide.pdf', 100, 'application/pdf'),
        ), ['Accept' => 'application/json'])->assertForbidden();
        $this->assertDatabaseCount('training_materials', 0);
    }

    public function test_oversized_request_returns_an_arabic_413_response(): void
    {
        Route::post('/api/upload-size-test', function () {
            throw new PostTooLargeException;
        });
        $this->postJson('/api/upload-size-test')->assertStatus(413)->assertJsonPath(
            'message',
            'حجم المرفقات مجتمعة يتجاوز حد استقبال الطلب في الخادم. قلّل عدد الملفات أو أحجامها.',
        );
    }

    private function payload(UploadedFile $file): array
    {
        return ['title' => 'مادة تدريبية', 'attachments' => [['label' => 'دليل التدريب', 'file' => $file]]];
    }
}
