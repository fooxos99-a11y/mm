<?php

namespace App\Services;

use GuzzleHttp\Psr7\Uri;
use GuzzleHttp\Psr7\UriResolver;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class AttendanceLocationService
{
    public function coordinates(string $url): array
    {
        $visited = [];
        for ($redirect = 0; $redirect < 6; $redirect++) {
            $host = strtolower((string) parse_url($url, PHP_URL_HOST));
            if (parse_url($url, PHP_URL_SCHEME) !== 'https'
                || ! in_array($host, ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'], true)
                || parse_url($url, PHP_URL_USER) || parse_url($url, PHP_URL_PORT) || isset($visited[$url])) {
                break;
            }
            $visited[$url] = true;
            $decoded = urldecode($url);
            foreach (['/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/',
                '/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/',
                '/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/'] as $pattern) {
                if (preg_match($pattern, $decoded, $match) && abs((float) $match[1]) <= 90 && abs((float) $match[2]) <= 180) {
                    return ['latitude' => (float) $match[1], 'longitude' => (float) $match[2]];
                }
            }
            try {
                $response = Http::timeout(5)->withOptions(['allow_redirects' => false])->get($url);
                if ($response->redirect() && $response->header('Location')) {
                    $url = (string) UriResolver::resolve(new Uri($url), new Uri($response->header('Location')));

                    continue;
                }
                // Some Maps links resolve to a page whose canonical URL identifies the place.
                if ($response->successful()) {
                    $document = new \DOMDocument;
                    @$document->loadHTML($response->body());
                    $xpath = new \DOMXPath($document);
                    $canonical = $xpath->evaluate('string(//link[@rel="canonical"]/@href)');
                    if ($canonical === '') {
                        $canonical = $xpath->evaluate('string(//meta[@property="og:url"]/@content)');
                    }
                    if ($canonical !== '') {
                        $url = (string) UriResolver::resolve(new Uri($url), new Uri($canonical));

                        continue;
                    }
                }
                break;
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
            || $timestamp < now()->timestamp - 30 || $timestamp > now()->timestamp + 5) {
            throw ValidationException::withMessages(['location' => 'قراءة الموقع قديمة. حاول تأكيد الحضور مرة أخرى.']);
        }
        if ($accuracy <= 0 || $accuracy > min(100, $radius / 2)) {
            throw ValidationException::withMessages(['location' => 'دقة الموقع غير كافية. فعّل الموقع الدقيق وحاول مرة أخرى.']);
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
