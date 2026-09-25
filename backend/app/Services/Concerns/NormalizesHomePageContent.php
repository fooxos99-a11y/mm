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
                'menuSubtitle' => $this->normalizeHomePageText($programInput['menuSubtitle'] ?? null, $defaultProgram['menuSubtitle']),
                'description' => $this->normalizeHomePageText($programInput['description'] ?? null, $defaultProgram['description']),
                'audience' => $this->normalizeHomePageText($programInput['audience'] ?? null, $defaultProgram['audience']),
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
            'brandTitle' => $this->normalizeHomePageText($content['brandTitle'] ?? null, $defaults['brandTitle']),
            'licensesMenuTitle' => $this->normalizeHomePageText($content['licensesMenuTitle'] ?? null, $defaults['licensesMenuTitle']),
            'heroTitle' => $this->normalizeHomePageText($content['heroTitle'] ?? null, $defaults['heroTitle']),
            'heroText' => $this->normalizeHomePageText($content['heroText'] ?? null, $defaults['heroText']),
            'heroPrimaryButtonLabel' => $this->normalizeHomePageText($content['heroPrimaryButtonLabel'] ?? null, $defaults['heroPrimaryButtonLabel']),
            'heroSecondaryButtonLabel' => $this->normalizeHomePageText($content['heroSecondaryButtonLabel'] ?? null, $defaults['heroSecondaryButtonLabel']),
            'programsSectionTitle' => $this->normalizeHomePageText($content['programsSectionTitle'] ?? null, $defaults['programsSectionTitle']),
            'programAvailableActionLabel' => $this->normalizeHomePageText($content['programAvailableActionLabel'] ?? null, $defaults['programAvailableActionLabel']),
            'programUpcomingActionLabel' => $this->normalizeHomePageText($content['programUpcomingActionLabel'] ?? null, $defaults['programUpcomingActionLabel']),
            'faqEyebrow' => $this->normalizeHomePageText($content['faqEyebrow'] ?? null, $defaults['faqEyebrow']),
            'faqTitle' => $this->normalizeHomePageText($content['faqTitle'] ?? null, $defaults['faqTitle']),
            'faqText' => $this->normalizeHomePageText($content['faqText'] ?? null, $defaults['faqText']),
            'footerBrandTitle' => $this->normalizeHomePageText($content['footerBrandTitle'] ?? null, $defaults['footerBrandTitle']),
            'footerDescription' => $this->normalizeHomePageText($content['footerDescription'] ?? null, $defaults['footerDescription']),
            'footerAboutTitle' => $this->normalizeHomePageText($content['footerAboutTitle'] ?? null, $defaults['footerAboutTitle']),
            'footerHomeLabel' => $this->normalizeHomePageText($content['footerHomeLabel'] ?? null, $defaults['footerHomeLabel']),
            'footerLicensesLabel' => $this->normalizeHomePageText($content['footerLicensesLabel'] ?? null, $defaults['footerLicensesLabel']),
            'footerContactTitle' => $this->normalizeHomePageText($content['footerContactTitle'] ?? null, $defaults['footerContactTitle']),
            'footerAddress' => $this->normalizeHomePageText($content['footerAddress'] ?? null, $defaults['footerAddress']),
            'footerPhone' => $this->normalizeHomePageText($content['footerPhone'] ?? null, $defaults['footerPhone']),
            'footerPoliciesTitle' => $this->normalizeHomePageText($content['footerPoliciesTitle'] ?? null, $defaults['footerPoliciesTitle']),
            'footerPrivacyLabel' => $this->normalizeHomePageText($content['footerPrivacyLabel'] ?? null, $defaults['footerPrivacyLabel']),
            'footerTermsLabel' => $this->normalizeHomePageText($content['footerTermsLabel'] ?? null, $defaults['footerTermsLabel']),
            'footerCopyright' => $this->normalizeHomePageText($content['footerCopyright'] ?? null, $defaults['footerCopyright']),
            'footerDevelopedBy' => $this->normalizeHomePageText($content['footerDevelopedBy'] ?? null, $defaults['footerDevelopedBy']),
            'achievements' => [
                'maleTraineesTitle' => $this->normalizeHomePageText($achievementsInput['maleTraineesTitle'] ?? null, $defaults['achievements']['maleTraineesTitle']),
                'femaleTraineesTitle' => $this->normalizeHomePageText($achievementsInput['femaleTraineesTitle'] ?? null, $defaults['achievements']['femaleTraineesTitle']),
                'satisfactionRateTitle' => $this->normalizeHomePageText($achievementsInput['satisfactionRateTitle'] ?? null, $defaults['achievements']['satisfactionRateTitle']),
                'licenseCountTitle' => $this->normalizeHomePageText($achievementsInput['licenseCountTitle'] ?? null, $defaults['achievements']['licenseCountTitle']),
            ],
            'programs' => $programs,
            'faqItems' => $faqItems,
        ];
    }
}
