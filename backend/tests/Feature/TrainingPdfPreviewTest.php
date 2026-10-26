<?php

namespace Tests\Feature;

use App\Jobs\PrepareTrainingPdfPreview;
use App\Models\TrainingMaterial;
use App\Models\User;
use App\Services\TrainingPdfPreviewService;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\Process\Process;
use Tests\Support\TrainingPdfFixture;
use Tests\TestCase;

class TrainingPdfPreviewTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_upload_queues_preview_without_waiting_for_conversion(): void
    {
        Storage::fake('local');
        Queue::fake();
        $this->post('/api/dashboard/training-materials', [
            'title' => 'مستند', 'attachments' => [['label' => 'ملف', 'file' => UploadedFile::fake()->createWithContent('guide.pdf', "%PDF-1.4\n%%EOF")]],
        ], ['Accept' => 'application/json'])->assertCreated();
        Queue::assertPushed(PrepareTrainingPdfPreview::class, fn ($job) => $job->queue === 'default' && $job->connection === 'training-previews');
    }

    public function test_partial_requests_and_download_preserve_original(): void
    {
        [$media, $url] = $this->attachment();
        $response = $this->get($url, ['Range' => 'bytes=0-4'])->assertStatus(206);
        $response->assertHeader('Content-Range', 'bytes 0-4/23')->assertHeader('Accept-Ranges', 'bytes');
        $this->assertSame($media->getPath(), $response->baseResponse->getFile()->getPathname());
        $this->get($url, ['Range' => 'bytes=10000-20000'])->assertStatus(416);
        $this->get($url.'?download=1')->assertDownload('guide.pdf');
    }

    public function test_optimized_preview_and_fallback_require_same_authorization(): void
    {
        [$media, $url] = $this->attachment();
        $this->get($url.'?preview=1')->assertOk();
        $preview = app(TrainingPdfPreviewService::class)->path($media);
        file_put_contents($preview, '%PDF-preview');
        $response = $this->get($url.'?preview=1', ['Range' => 'bytes=0-4'])->assertStatus(206);
        $this->assertSame($preview, $response->baseResponse->getFile()->getPathname());
        $original = $this->get($url.'?preview=1&download=1')->assertOk();
        $this->assertSame($media->getPath(), $original->baseResponse->getFile()->getPathname());
        Sanctum::actingAs(User::factory()->create(['role' => 'female_manager']));
        $this->get($url.'?preview=1', ['Range' => 'bytes=0-4'])->assertForbidden();
    }

    public function test_failed_converter_preserves_original_and_removes_temporary_files(): void
    {
        [$media] = $this->attachment();
        config(['training-preview.qpdf' => '/missing/qpdf']);
        app(TrainingPdfPreviewService::class)->prepare($media);
        $this->assertSame('unavailable', $media->fresh()->getCustomProperty('preview_status'));
        $this->assertSame('%PDF-1.4 original bytes', file_get_contents($media->getPath()));
        $this->assertCount(1, glob(dirname($media->getPath()).'/*'));
    }

    public function test_background_job_preserves_department_scope_and_marks_final_failure(): void
    {
        [$media] = $this->attachment();
        $originalContext = DepartmentContext::id();
        $wrongDepartment = new PrepareTrainingPdfPreview((int) $media->id, 'foreign-department');
        $wrongDepartment->handle(app(TrainingPdfPreviewService::class));
        $this->assertNull($media->fresh()->getCustomProperty('preview_status'));
        $job = new PrepareTrainingPdfPreview((int) $media->id, (string) $originalContext);
        $job->failed(null);
        $this->assertSame('unavailable', $media->fresh()->getCustomProperty('preview_status'));
        $this->assertSame($originalContext, DepartmentContext::id());
    }

    public function test_real_converter_creates_smaller_private_preview_and_preserves_original(): void
    {
        [$media] = $this->attachment();
        file_put_contents($media->getPath(), TrainingPdfFixture::bytes());
        $hash = hash_file('sha256', $media->getPath());
        $service = app(TrainingPdfPreviewService::class);
        $service->prepare($media);
        $this->assertSame('ready', $media->fresh()->getCustomProperty('preview_status'));
        $this->assertSame($hash, hash_file('sha256', $media->getPath()));
        $this->assertLessThan(filesize($media->getPath()), filesize($service->path($media)));
        $pages = new Process([config('training-preview.qpdf'), '--show-npages', $service->path($media)]);
        $pages->mustRun();
        $this->assertSame('1', trim($pages->getOutput()));
        if (PHP_OS_FAMILY !== 'Windows') {
            $this->assertSame(0640, fileperms($service->path($media)) & 0777);
        }
        copy($service->path($media), $media->getPath());
        $service->prepare($media);
        $this->assertSame('original', $media->fresh()->getCustomProperty('preview_status'));
    }

    public function test_converter_warning_retries_without_decoding_source_streams(): void
    {
        [$media] = $this->attachment();
        $original = TrainingPdfFixture::bytes(true);
        file_put_contents($media->getPath(), $original);
        preg_match('/\nstream\n(.*?)\nendstream/s', $original, $matches);
        $probe = $media->getPath().'.probe.pdf';
        try {
            $process = new Process([config('training-preview.qpdf'), '--recompress-flate', $media->getPath(), $probe]);
            $this->assertSame(3, $process->run());
        } finally {
            @unlink($probe);
        }
        $service = app(TrainingPdfPreviewService::class);
        $service->prepare($media);
        $this->assertSame('ready', $media->fresh()->getCustomProperty('preview_status'));
        $this->assertSame($original, file_get_contents($media->getPath()));
        $this->assertStringContainsString($matches[1], file_get_contents($service->path($media)));
        $this->assertLessThan(strlen($original), filesize($service->path($media)));
    }

    public function test_non_pdf_and_locked_conversion_do_not_mutate_media(): void
    {
        [$media] = $this->attachment();
        $lock = Cache::lock('training-preview:'.$media->id, 200);
        $lock->get();
        app(TrainingPdfPreviewService::class)->prepare($media);
        $this->assertNull($media->fresh()->getCustomProperty('preview_status'));
        $lock->release();
        $media->mime_type = 'image/png';
        $media->save();
        app(TrainingPdfPreviewService::class)->prepare($media);
        $this->assertNull($media->fresh()->getCustomProperty('preview_status'));
    }

    public function test_backfill_preview_and_apply_are_department_scoped_and_idempotent(): void
    {
        [$media] = $this->attachment();
        Queue::fake();
        $department = (string) DepartmentContext::id();
        $this->artisan('training-materials:prepare-previews', ['--department' => 'missing'])->assertExitCode(1);
        $this->artisan('training-materials:prepare-previews', ['--department' => $department])->expectsOutput('{"count":1,"queued":false}')->assertSuccessful();
        Queue::assertNothingPushed();
        $this->artisan('training-materials:prepare-previews', ['--department' => $department, '--apply' => true])->expectsOutput('{"count":1,"queued":true}')->assertSuccessful();
        Queue::assertPushed(PrepareTrainingPdfPreview::class, 1);
        $this->assertSame('queued', $media->fresh()->getCustomProperty('preview_status'));
        $this->artisan('training-materials:prepare-previews', ['--department' => $department, '--apply' => true])->expectsOutput('{"count":0,"queued":true}')->assertSuccessful();
        Queue::assertPushed(PrepareTrainingPdfPreview::class, 1);
    }

    private function attachment(): array
    {
        Storage::fake('local');
        $material = TrainingMaterial::query()->create(['title' => 'خاص', 'target_branch_code' => 'male']);
        Storage::disk('local')->put('source.pdf', '%PDF-1.4 original bytes');
        $media = $material->addMedia(Storage::disk('local')->path('source.pdf'))
            ->withCustomProperties(['original_client_name' => 'guide.pdf'])->toMediaCollection('attachments', 'local');

        return [$media, '/api/training-material-attachments/'.$media->uuid];
    }
}
