<?php

namespace App\Services\Concerns;

trait NormalizesHomePageContent
{
    private function normalizeHomePageContent(array $content): array
    {
        $defaults = $this->defaultHomePageContent();
        $achievementsInput = is_array($content['achievements'] ?? null) ? $content['achievements'] : [];
        $programsInput = is_array($content['programs'] ?? null) ? $content['programs'] : [];
        $faqItemsInput = is_array($content['faqItems'] ?? null) ? $content['faqItems'] : [];

        $programs = [];

        foreach ($defaults['programs'] as $index => $defaultProgram) {
            $programInput = is_array($programsInput[$index] ?? null) ? $programsInput[$index] : [];
            $featuresInput = is_array($programInput['features'] ?? null) ? $programInput['features'] : [];
            $features = [];

            foreach ($defaultProgram['features'] as $featureIndex => $defaultFeature) {
                $features[] = $this->normalizeHomePageText($featuresInput[$featureIndex] ?? null, $defaultFeature);
            }

            $programs[] = [
                'title' => $this->normalizeHomePageText($programInput['title'] ?? null, $defaultProgram['title']),
                'menuSubtitle' => $this->normalizeHomePageText(
                    $programInput['menuSubtitle'] ?? null,
                    $defaultProgram['menuSubtitle']
                ),
                'description' => $this->normalizeHomePageText(
                    $programInput['description'] ?? null,
                    $defaultProgram['description']
                ),
                'audience' => $this->normalizeHomePageText(
                    $programInput['audience'] ?? null,
                    $defaultProgram['audience']
                ),
                'features' => $features,
            ];
        }

        $faqItems = [];

        foreach ($defaults['faqItems'] as $index => $defaultItem) {
            $itemInput = is_array($faqItemsInput[$index] ?? null) ? $faqItemsInput[$index] : [];

            $faqItems[] = [
                'question' => $this->normalizeHomePageText($itemInput['question'] ?? null, $defaultItem['question']),
                'answer' => $this->normalizeHomePageText($itemInput['answer'] ?? null, $defaultItem['answer']),
            ];
        }

        return [
            ...$this->normalizePageTextFields($content, $defaults, [
                'brandTitle',
                'licensesMenuTitle',
                'heroTitle',
                'heroText',
                'heroPrimaryButtonLabel',
                'heroSecondaryButtonLabel',
                'programsSectionTitle',
                'programAvailableActionLabel',
                'programUpcomingActionLabel',
                'faqEyebrow',
                'faqTitle',
                'faqText',
                'footerBrandTitle',
                'footerDescription',
                'footerAboutTitle',
                'footerHomeLabel',
                'footerLicensesLabel',
                'footerContactTitle',
                'footerAddress',
                'footerPhone',
                'footerPoliciesTitle',
                'footerPrivacyLabel',
                'footerTermsLabel',
                'footerCopyright',
                'footerDevelopedBy',
            ]),
            'achievements' => [
                'maleTraineesTitle' => $this->normalizeHomePageText(
                    $achievementsInput['maleTraineesTitle'] ?? null,
                    $defaults['achievements']['maleTraineesTitle']
                ),
                'femaleTraineesTitle' => $this->normalizeHomePageText(
                    $achievementsInput['femaleTraineesTitle'] ?? null,
                    $defaults['achievements']['femaleTraineesTitle']
                ),
                'satisfactionRateTitle' => $this->normalizeHomePageText(
                    $achievementsInput['satisfactionRateTitle'] ?? null,
                    $defaults['achievements']['satisfactionRateTitle']
                ),
                'licenseCountTitle' => $this->normalizeHomePageText(
                    $achievementsInput['licenseCountTitle'] ?? null,
                    $defaults['achievements']['licenseCountTitle']
                ),
            ],
            'programs' => $programs,
            'faqItems' => $faqItems,
        ];
    }
}
