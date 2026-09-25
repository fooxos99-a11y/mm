<?php

namespace Tests\Feature;

use App\Services\PageContentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PageContentEncodingTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_page_content_is_returned_as_valid_arabic(): void
    {
        $content = app(PageContentService::class)->loadHomePageContent();
        $json = json_encode($content, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        $this->assertMatchesRegularExpression('/\p{Arabic}/u', $content['brandTitle']);
        $this->assertStringNotContainsString('Ã', $json);
        $this->assertStringNotContainsString('Ø', $json);
        $this->assertStringNotContainsString('Ù', $json);
    }

    public function test_saved_mojibake_is_repaired_by_explicit_migration_service(): void
    {
        $expected = 'برنامج ممارس';
        $mojibake = mb_convert_encoding($expected, 'UTF-8', 'Windows-1252');

        DB::table('app_settings')->insert([
            'setting_key' => 'home_page_content',
            'value' => json_encode(['brandTitle' => $mojibake], JSON_UNESCAPED_UNICODE),
            'updated_at' => now(),
        ]);

        $service = app(PageContentService::class);
        $content = $service->loadHomePageContent();
        $storedBeforeRepair = json_decode((string) DB::table('app_settings')
            ->where('setting_key', 'home_page_content')
            ->value('value'), true, flags: JSON_THROW_ON_ERROR);

        $service->repairStoredContentEncoding();

        $stored = json_decode((string) DB::table('app_settings')
            ->where('setting_key', 'home_page_content')
            ->value('value'), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame($expected, $content['brandTitle']);
        $this->assertSame($mojibake, $storedBeforeRepair['brandTitle']);
        $this->assertSame($expected, $stored['brandTitle']);
    }
}
