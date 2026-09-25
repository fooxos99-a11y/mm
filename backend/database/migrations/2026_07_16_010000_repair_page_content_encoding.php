<?php

use App\Services\PageContentService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('app_settings')) {
            return;
        }

        app(PageContentService::class)->repairStoredContentEncoding();
    }

    public function down(): void
    {
        // Encoding repair is intentionally irreversible.
    }
};
