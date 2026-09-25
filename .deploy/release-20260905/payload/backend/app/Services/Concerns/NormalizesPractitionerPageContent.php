<?php

namespace App\Services\Concerns;

trait NormalizesPractitionerPageContent
{
    private function normalizePractitionerPageContent(array $content): array
    {
        $defaults = $this->defaultPractitionerPageContent();
        $navItemsInput = is_array($content['navItems'] ?? null) ? $content['navItems'] : $defaults['navItems'];
        $indicatorLabelsInput = is_array($content['indicatorLabels'] ?? null) ? $content['indicatorLabels'] : [];
        $goalsInput = is_array($content['goals'] ?? null) ? $content['goals'] : $defaults['goals'];
        $domainsInput = is_array($content['domains'] ?? null) ? $content['domains'] : $defaults['domains'];
        $includesItemsInput = is_array($content['includesItems'] ?? null) ? $content['includesItems'] : $defaults['includesItems'];
        $requirementsInput = is_array($content['requirements'] ?? null) ? $content['requirements'] : $defaults['requirements'];
        $recitationInput = is_array($content['recitation'] ?? null) ? $content['recitation'] : $defaults['recitation'];
        $recitationMechanismItemsInput = is_array($content['recitationMechanismItems'] ?? null) ? $content['recitationMechanismItems'] : $defaults['recitationMechanismItems'];
        $durationQuickInfoInput = is_array($content['durationQuickInfo'] ?? null) ? $content['durationQuickInfo'] : $defaults['durationQuickInfo'];
        $startDatesInput = is_array($content['startDates'] ?? null) ? $content['startDates'] : $defaults['startDates'];

        $indicatorLabels = [];

        foreach ($defaults['indicatorLabels'] as $key => $defaultLabel) {
            $indicatorLabels[$key] = $this->normalizeHomePageText($indicatorLabelsInput[$key] ?? null, $defaultLabel);
        }

        $domains = [];

        foreach ($domainsInput as $index => $domainInput) {
            $defaultDomain = $defaults['domains'][$index] ?? ['title' => '', 'items' => []];
            $domainInput = is_array($domainInput) ? $domainInput : [];
            $itemsInput = is_array($domainInput['items'] ?? null) ? $domainInput['items'] : $defaultDomain['items'];
            $items = [];

            foreach ($itemsInput as $itemIndex => $itemInput) {
                $defaultItem = $defaultDomain['items'][$itemIndex] ?? '';
                $items[] = $this->normalizeHomePageText($itemsInput[$itemIndex] ?? null, $defaultItem);
            }

            $domains[] = [
                'title' => $this->normalizeHomePageText($domainInput['title'] ?? null, $defaultDomain['title']),
                'items' => $items,
            ];
        }

        $includesItems = [];

        foreach ($includesItemsInput as $index => $itemInput) {
            $defaultItem = $defaults['includesItems'][$index] ?? ['num' => str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT), 'title' => ''];
            $itemInput = is_array($itemInput) ? $itemInput : [];
            $includesItems[] = [
                'num' => $this->normalizeHomePageText($itemInput['num'] ?? null, $defaultItem['num']),
                'title' => $this->normalizeHomePageText($itemInput['title'] ?? null, $defaultItem['title']),
            ];
        }

        $recitation = [];

        foreach ($recitationInput as $index => $itemInput) {
            $defaultItem = $defaults['recitation'][$index] ?? ['tag' => '', 'text' => ''];
            $itemInput = is_array($itemInput) ? $itemInput : [];
            $recitation[] = [
                'tag' => $this->normalizeHomePageText($itemInput['tag'] ?? null, $defaultItem['tag']),
                'text' => $this->normalizeHomePageText($itemInput['text'] ?? null, $defaultItem['text']),
            ];
        }

        $durationQuickInfo = [];

        foreach ($durationQuickInfoInput as $index => $itemInput) {
            $defaultItem = $defaults['durationQuickInfo'][$index] ?? ['label' => '', 'value' => ''];
            $itemInput = is_array($itemInput) ? $itemInput : [];
            $durationQuickInfo[] = [
                'label' => $this->normalizeHomePageText($itemInput['label'] ?? null, $defaultItem['label']),
                'value' => $this->normalizeHomePageText($itemInput['value'] ?? null, $defaultItem['value']),
            ];
        }

        $startDates = [];

        foreach ($startDatesInput as $index => $itemInput) {
            $defaultItem = $defaults['startDates'][$index] ?? ['tag' => '', 'text' => ''];
            $itemInput = is_array($itemInput) ? $itemInput : [];
            $startDates[] = [
                'tag' => $this->normalizeHomePageText($itemInput['tag'] ?? null, $defaultItem['tag']),
                'text' => $this->normalizeHomePageText($itemInput['text'] ?? null, $defaultItem['text']),
            ];
        }

        return [
            'brandTitle' => $this->normalizeHomePageText($content['brandTitle'] ?? null, $defaults['brandTitle']),
            'heroTitle' => $this->normalizeHomePageText($content['heroTitle'] ?? null, $defaults['heroTitle']),
            'heroText' => $this->normalizeHomePageText($content['heroText'] ?? null, $defaults['heroText']),
            'heroPrimaryButtonLabel' => $this->normalizeHomePageText($content['heroPrimaryButtonLabel'] ?? null, $defaults['heroPrimaryButtonLabel']),
            'heroSecondaryButtonLabel' => $this->normalizeHomePageText($content['heroSecondaryButtonLabel'] ?? null, $defaults['heroSecondaryButtonLabel']),
            'navItems' => collect($navItemsInput)->map(function ($itemInput, int $index) use ($defaults) {
                $defaultItem = $defaults['navItems'][$index] ?? ['label' => ''];
                $itemInput = is_array($itemInput) ? $itemInput : [];

                return [
                    'label' => $this->normalizeHomePageText($itemInput['label'] ?? null, $defaultItem['label']),
                ];
            })->values()->all(),
            'aboutEyebrow' => $this->normalizeHomePageText($content['aboutEyebrow'] ?? null, $defaults['aboutEyebrow']),
            'aboutTitlePrefix' => $this->normalizeHomePageText($content['aboutTitlePrefix'] ?? null, $defaults['aboutTitlePrefix']),
            'aboutTitleHighlight' => $this->normalizeHomePageText($content['aboutTitleHighlight'] ?? null, $defaults['aboutTitleHighlight']),
            'aboutLead' => $this->normalizeHomePageText($content['aboutLead'] ?? null, $defaults['aboutLead']),
            'aboutBody' => $this->normalizeHomePageText($content['aboutBody'] ?? null, $defaults['aboutBody']),
            'goalsHeadingPrefix' => $this->normalizeHomePageText($content['goalsHeadingPrefix'] ?? null, $defaults['goalsHeadingPrefix']),
            'goalsHeadingHighlight' => $this->normalizeHomePageText($content['goalsHeadingHighlight'] ?? null, $defaults['goalsHeadingHighlight']),
            'goals' => collect($goalsInput)->map(fn ($item, int $index) => $this->normalizeHomePageText($item, $defaults['goals'][$index] ?? ''))->values()->all(),
            'statsEyebrow' => $this->normalizeHomePageText($content['statsEyebrow'] ?? null, $defaults['statsEyebrow']),
            'statsTitlePrefix' => $this->normalizeHomePageText($content['statsTitlePrefix'] ?? null, $defaults['statsTitlePrefix']),
            'statsTitleHighlight' => $this->normalizeHomePageText($content['statsTitleHighlight'] ?? null, $defaults['statsTitleHighlight']),
            'indicatorLabels' => $indicatorLabels,
            'competenciesTitle' => $this->normalizeHomePageText($content['competenciesTitle'] ?? null, $defaults['competenciesTitle']),
            'domains' => $domains,
            'includesTitle' => $this->normalizeHomePageText($content['includesTitle'] ?? null, $defaults['includesTitle']),
            'includesItems' => $includesItems,
            'requirementsTitle' => $this->normalizeHomePageText($content['requirementsTitle'] ?? null, $defaults['requirementsTitle']),
            'requirements' => collect($requirementsInput)->map(fn ($item, int $index) => $this->normalizeHomePageText($item, $defaults['requirements'][$index] ?? ''))->values()->all(),
            'recitationTitle' => $this->normalizeHomePageText($content['recitationTitle'] ?? null, $defaults['recitationTitle']),
            'recitation' => $recitation,
            'recitationMechanismTitle' => $this->normalizeHomePageText($content['recitationMechanismTitle'] ?? null, $defaults['recitationMechanismTitle']),
            'recitationMechanismItems' => collect($recitationMechanismItemsInput)->map(fn ($item, int $index) => $this->normalizeHomePageText($item, $defaults['recitationMechanismItems'][$index] ?? ''))->values()->all(),
            'durationTitle' => $this->normalizeHomePageText($content['durationTitle'] ?? null, $defaults['durationTitle']),
            'durationQuickInfo' => $durationQuickInfo,
            'durationDescriptionPrimary' => $this->normalizeHomePageText($content['durationDescriptionPrimary'] ?? null, $defaults['durationDescriptionPrimary']),
            'durationDescriptionSecondary' => $this->normalizeHomePageText($content['durationDescriptionSecondary'] ?? null, $defaults['durationDescriptionSecondary']),
            'startDatesTitle' => $this->normalizeHomePageText($content['startDatesTitle'] ?? null, $defaults['startDatesTitle']),
            'startDates' => $startDates,
            'footerBrandTitle' => $this->normalizeHomePageText($content['footerBrandTitle'] ?? null, $defaults['footerBrandTitle']),
            'footerDescription' => $this->normalizeHomePageText($content['footerDescription'] ?? null, $defaults['footerDescription']),
            'footerQuickLinksTitle' => $this->normalizeHomePageText($content['footerQuickLinksTitle'] ?? null, $defaults['footerQuickLinksTitle']),
            'footerContactTitle' => $this->normalizeHomePageText($content['footerContactTitle'] ?? null, $defaults['footerContactTitle']),
            'footerAddress' => $this->normalizeHomePageText($content['footerAddress'] ?? null, $defaults['footerAddress']),
            'footerPhone' => $this->normalizeHomePageText($content['footerPhone'] ?? null, $defaults['footerPhone']),
            'footerPoliciesTitle' => $this->normalizeHomePageText($content['footerPoliciesTitle'] ?? null, $defaults['footerPoliciesTitle']),
            'footerPrivacyLabel' => $this->normalizeHomePageText($content['footerPrivacyLabel'] ?? null, $defaults['footerPrivacyLabel']),
            'footerTermsLabel' => $this->normalizeHomePageText($content['footerTermsLabel'] ?? null, $defaults['footerTermsLabel']),
            'footerCopyright' => $this->normalizeHomePageText($content['footerCopyright'] ?? null, $defaults['footerCopyright']),
            'footerDevelopedBy' => $this->normalizeHomePageText($content['footerDevelopedBy'] ?? null, $defaults['footerDevelopedBy']),
            'loginDialogTitle' => $this->normalizeHomePageText($content['loginDialogTitle'] ?? null, $defaults['loginDialogTitle']),
            'loginCodeLabel' => $this->normalizeHomePageText($content['loginCodeLabel'] ?? null, $defaults['loginCodeLabel']),
            'loginPasswordLabel' => $this->normalizeHomePageText($content['loginPasswordLabel'] ?? null, $defaults['loginPasswordLabel']),
            'loginSubmitLabel' => $this->normalizeHomePageText($content['loginSubmitLabel'] ?? null, $defaults['loginSubmitLabel']),
        ];
    }
}
