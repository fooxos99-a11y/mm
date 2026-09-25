<?php

namespace App\Services;

use App\Services\Concerns\NormalizesHomePageContent;
use App\Services\Concerns\NormalizesPractitionerPageContent;
use App\Services\Concerns\ProvidesPageContentDefaults;
use App\Services\Concerns\RepairsPageContentEncoding;

class PageContentService
{
    use NormalizesHomePageContent;
    use NormalizesPractitionerPageContent;
    use ProvidesPageContentDefaults;
    use RepairsPageContentEncoding;

    public function __construct(private readonly AppSettingsService $appSettingsService) {}

    public function loadHomePageContent(): array
    {
        $stored = $this->appSettingsService->loadJson('home_page_content', $this->defaultHomePageContent());

        return $this->normalizeHomePageContent($stored);
    }

    public function updateHomePageContent(array $content): array
    {
        $normalized = $this->normalizeHomePageContent($content);
        $this->appSettingsService->storeJson('home_page_content', $normalized);

        return $normalized;
    }

    public function loadPractitionerPageContent(): array
    {
        $stored = $this->appSettingsService->loadJson('practitioner_page_content', $this->defaultPractitionerPageContent());

        return $this->normalizePractitionerPageContent($stored);
    }

    public function updatePractitionerPageContent(array $content): array
    {
        $normalized = $this->normalizePractitionerPageContent($content);
        $this->appSettingsService->storeJson('practitioner_page_content', $normalized);

        return $normalized;
    }

    public function repairStoredContentEncoding(): void
    {
        foreach (['home_page_content', 'practitioner_page_content'] as $key) {
            $stored = $this->appSettingsService->loadJson($key, []);

            if ($stored === []) {
                continue;
            }

            $repaired = $this->repairEncodingValue($stored);

            if ($repaired !== $stored) {
                $this->appSettingsService->storeJson($key, $repaired);
            }
        }
    }
}
