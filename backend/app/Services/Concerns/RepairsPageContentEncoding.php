<?php

namespace App\Services\Concerns;

trait RepairsPageContentEncoding
{
    private function normalizeHomePageText(mixed $value, string $default): string
    {
        $normalized = trim(is_string($value) ? $value : $default);

        // Older page-content values may have been saved as Windows-1252 mojibake.
        for ($attempt = 0; $attempt < 2; $attempt++) {
            if (! preg_match('/[\x{00C3}\x{00D8}\x{00D9}]/u', $normalized)) {
                break;
            }

            $repaired = $this->decodeWindows1252Mojibake($normalized);

            if ($repaired === $normalized) {
                break;
            }

            $normalized = $repaired;
        }

        return str_replace(
            [
                'Ù…ØªØ¯Ø±Ø¨ÙŠ ÙˆÙ…ØªØ¯Ø±Ø¨Ø§Øª',
                'Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙˆÙ† ÙˆØ§Ù„Ù…ØªØ¯Ø±Ø¨Ø§Øª',
                'Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† ÙˆØ§Ù„Ù…ØªØ¯Ø±Ø¨Ø§Øª',
                'Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ†',
                'Ø§Ù„Ù…ØªØ¯Ø±Ø¨Ø§Øª',
                'Ù…ØªØ¯Ø±Ø¨ÙŠÙ†',
                'Ù…ØªØ¯Ø±Ø¨Ø§Øª',
                'Ø§Ù„Ù…ØªØ¯Ø±Ø¨',
                'Ø§Ù„Ù…ØªØ¯Ø±Ø¨Ø©',
                'Ù…ØªØ¯Ø±Ø¨',
                'Ù…ØªØ¯Ø±Ø¨Ø©',
            ],
            [
                'Ù…Ø¹Ù„Ù…ÙŠ ÙˆÙ…Ø¹Ù„Ù…Ø§Øª',
                'Ø§Ù„Ù…Ø¹Ù„Ù…ÙˆÙ† ÙˆØ§Ù„Ù…Ø¹Ù„Ù…Ø§Øª',
                'Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† ÙˆØ§Ù„Ù…Ø¹Ù„Ù…Ø§Øª',
                'Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†',
                'Ø§Ù„Ù…Ø¹Ù„Ù…Ø§Øª',
                'Ù…Ø¹Ù„Ù…ÙŠÙ†',
                'Ù…Ø¹Ù„Ù…Ø§Øª',
                'Ø§Ù„Ù…Ø¹Ù„Ù…',
                'Ø§Ù„Ù…Ø¹Ù„Ù…Ø©',
                'Ù…Ø¹Ù„Ù…',
                'Ù…Ø¹Ù„Ù…Ø©',
            ],
            $normalized,
        );
    }

    private function decodeWindows1252Mojibake(string $value): string
    {
        $bytes = '';
        $extensions = [
            0x20AC => 0x80, 0x201A => 0x82, 0x0192 => 0x83, 0x201E => 0x84,
            0x2026 => 0x85, 0x2020 => 0x86, 0x2021 => 0x87, 0x02C6 => 0x88,
            0x2030 => 0x89, 0x0160 => 0x8A, 0x2039 => 0x8B, 0x0152 => 0x8C,
            0x017D => 0x8E, 0x2018 => 0x91, 0x2019 => 0x92, 0x201C => 0x93,
            0x201D => 0x94, 0x2022 => 0x95, 0x2013 => 0x96, 0x2014 => 0x97,
            0x02DC => 0x98, 0x2122 => 0x99, 0x0161 => 0x9A, 0x203A => 0x9B,
            0x0153 => 0x9C, 0x017E => 0x9E, 0x0178 => 0x9F,
        ];

        foreach (mb_str_split($value) as $character) {
            $codePoint = mb_ord($character, 'UTF-8');

            if ($codePoint <= 0xFF) {
                $bytes .= chr($codePoint);

                continue;
            }

            if (! array_key_exists($codePoint, $extensions)) {
                return $value;
            }

            $bytes .= chr($extensions[$codePoint]);
        }

        return mb_check_encoding($bytes, 'UTF-8') ? $bytes : $value;
    }

    private function repairEncodingValue(mixed $value): mixed
    {
        if (is_array($value)) {
            return array_map(fn (mixed $item): mixed => $this->repairEncodingValue($item), $value);
        }

        if (! is_string($value)) {
            return $value;
        }

        $repaired = $value;

        for ($attempt = 0; $attempt < 2 && preg_match('/[\x{00C3}\x{00D8}\x{00D9}]/u', $repaired); $attempt++) {
            $candidate = $this->decodeWindows1252Mojibake($repaired);

            if ($candidate === $repaired) {
                break;
            }

            $repaired = $candidate;
        }

        return $repaired;
    }
}
