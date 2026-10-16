<?php

namespace Tests\Feature;

use App\Models\EditorAsset;
use App\Models\TrainingMaterial;
use App\Services\CoreDataService;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class LegacyTrainingMediaPrivacyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    private function legacyAttachment(): \App\Models\Media
    {
        $material = TrainingMaterial::query()->create(['title' => 'ملف قديم']);

        return $material->addMedia(UploadedFile::fake()->createWithContent('guide.pdf', '%PDF-1.4 legacy-private'))
            ->toMediaCollection('attachments', 'public');
    }

    public function test_preview_changes_nothing_and_apply_verifies_private_copy_before_removing_public_file(): void
    {
        $media = $this->legacyAttachment();
        $path = $media->getPathRelativeToRoot();
        $content = Storage::disk('public')->get($path);
        $editor = EditorAsset::query()->create([]);
        $publicImage = $editor->addMedia(UploadedFile::fake()->image('visible.png'))
            ->toMediaCollection('editor-images', 'public');
        $this->artisan('department:secure-legacy-media')->assertSuccessful();
        $this->assertSame('public', $media->fresh()->disk);
        Storage::disk('public')->assertExists($path);
        Storage::disk('local')->assertMissing($path);

        $this->artisan('department:secure-legacy-media', ['--apply' => true])->assertSuccessful();
        $this->assertSame('local', $media->fresh()->disk);
        $this->assertSame($content, Storage::disk('local')->get($path));
        Storage::disk('public')->assertMissing($path);
        Storage::disk('public')->assertExists($publicImage->getPathRelativeToRoot());
        $this->artisan('department:secure-legacy-media', ['--apply' => true])->assertSuccessful();
    }

    public function test_conflicting_private_copy_preserves_public_original_and_database_metadata(): void
    {
        $media = $this->legacyAttachment();
        $path = $media->getPathRelativeToRoot();
        Storage::disk('local')->put($path, 'different-private-file');
        $this->artisan('department:secure-legacy-media', ['--apply' => true])->assertFailed();
        $this->assertSame('public', $media->fresh()->disk);
        Storage::disk('public')->assertExists($path);
        $this->assertSame('different-private-file', Storage::disk('local')->get($path));
    }

    public function test_missing_public_original_preserves_metadata(): void
    {
        $media = $this->legacyAttachment();
        $path = $media->getPathRelativeToRoot();
        Storage::disk('public')->delete($path);
        $this->artisan('department:secure-legacy-media', ['--apply' => true])->assertFailed();
        $this->assertSame('public', $media->fresh()->disk);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_retry_removes_verified_public_conversion_left_after_partial_cleanup(): void
    {
        $media = $this->legacyAttachment();
        $path = $media->getPathRelativeToRoot();
        Storage::disk('local')->put($path, Storage::disk('public')->get($path));
        Storage::disk('public')->delete($path);
        $conversion = $media->id.'/conversions/preview.png';
        Storage::disk('local')->put($conversion, 'verified-preview');
        Storage::disk('public')->put($conversion, 'verified-preview');
        $media->forceFill(['disk' => 'local', 'conversions_disk' => 'local'])->save();

        $this->artisan('department:secure-legacy-media', ['--apply' => true])->assertSuccessful();
        Storage::disk('public')->assertMissing($conversion);
        Storage::disk('local')->assertExists($path);
        Storage::disk('local')->assertExists($conversion);
    }

    public function test_new_department_public_statistics_do_not_inherit_legacy_marketing_counts(): void
    {
        $legacy = app(CoreDataService::class)->loadPublicStats();
        $this->assertSame(274, $legacy['courses']);
        $departmentId = (string) Str::uuid();
        DB::table('departments')->insert([
            'id' => $departmentId, 'name' => 'إدارة جديدة', 'manager_title' => 'مدير',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DepartmentContext::set($departmentId);
        $stats = app(CoreDataService::class)->loadPublicStats();
        $this->assertSame(0, $stats['graduates']);
        $this->assertSame(0, $stats['courses']);
        $this->assertSame(0, $stats['batches']);
        app(\App\Services\CourseManagementService::class)->createCourse('دورة الإدارة', true);
        $this->assertSame(1, app(CoreDataService::class)->loadPublicStats()['courses']);
    }
}
