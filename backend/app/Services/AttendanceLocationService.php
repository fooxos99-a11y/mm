<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class AttendanceLocationService
{
    public function coordinates(string $url): array
    {
        for ($redirect = 0; $redirect < 6; $redirect++) {
            $host = strtolower((string) parse_url($url, PHP_URL_HOST));
            if (parse_url($url, PHP_URL_SCHEME) !== 'https'
                || ! in_array($host, ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'], true)
                || parse_url($url, PHP_URL_USER) || parse_url($url, PHP_URL_PORT)) {
                break;
            }
            $decoded = urldecode($url);
            foreach (['/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/',
                '/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/',
                '/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/'] as $pattern) {
                if (preg_match($pattern, $decoded, $match) && abs((float) $match[1]) <= 90 && abs((float) $match[2]) <= 180) {
                    return ['latitude' => (float) $match[1], 'longitude' => (float) $match[2]];
                }
            }
            if (! in_array($host, ['maps.app.goo.gl', 'goo.gl'], true)) {
                break;
            }
            try {
                $response = Http::timeout(5)->withOptions(['allow_redirects' => false])->get($url);
                $url = $response->redirect() ? (string) $response->header('Location') : '';
            } catch (\Throwable) {
                break;
            }
        }
        throw ValidationException::withMessages(['mapsUrl' => 'تعذر استخراج الموقع من رابط Google Maps.']);
    }

    public function assertInside(array $settings, array $position, int $challengedAt): void
    {
        $timestamp = (float) $position['timestamp'] / 1000;
        $accuracy = (float) $position['accuracy'];
        $radius = (float) $settings['radius'];
        if (! isset($settings['latitude'], $settings['longitude']) || $timestamp < $challengedAt
            || $timestamp < now()->timestamp - 30 || $timestamp > now()->timestamp + 5
            || $accuracy <= 0 || $accuracy > min(100, $radius / 2)) {
            throw ValidationException::withMessages(['location' => 'تعذر التحقق من دقة الموقع أو حداثته.']);
        }
        $lat1 = deg2rad((float) $settings['latitude']);
        $lat2 = deg2rad((float) $position['latitude']);
        $deltaLat = $lat2 - $lat1;
        $deltaLon = deg2rad((float) $position['longitude'] - (float) $settings['longitude']);
        $a = sin($deltaLat / 2) ** 2 + cos($lat1) * cos($lat2) * sin($deltaLon / 2) ** 2;
        $distance = 6371000 * 2 * asin(sqrt(min(1, max(0, $a))));
        if ($distance + $accuracy > $radius) {
            throw ValidationException::withMessages(['location' => 'أنت خارج نطاق التحضير أو دقة الموقع غير كافية.']);
        }
    }
}
