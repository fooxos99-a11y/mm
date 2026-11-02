<?php

namespace Tests\Unit;

use App\Services\AttendanceLocationService;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AttendanceLocationServiceTest extends TestCase
{
    public function test_short_link_follows_google_intermediate_and_relative_redirects(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://maps.app.goo.gl/example' => Http::response('', 302, ['Location' => 'https://www.google.com/maps?cid=123']),
            'https://www.google.com/maps?cid=123' => Http::response('', 302, ['Location' => '/maps/place/test/@24,46,10z/data=!3d24.7136!4d46.6753']),
        ]);

        $this->assertSame(['latitude' => 24.7136, 'longitude' => 46.6753],
            app(AttendanceLocationService::class)->coordinates('https://maps.app.goo.gl/example'));
        Http::assertSentCount(2);
    }

    public function test_google_page_can_supply_its_canonical_or_open_graph_place_url(): void
    {
        foreach (['<link rel="canonical" href="/maps?q=24.7136%2C46.6753&amp;hl=en">',
            '<meta property="og:url" content="https://www.google.com/maps?q=24.7136,46.6753">'] as $metadata) {
            Http::fake(['https://www.google.com/maps?cid=123' => Http::response('<html><head>'.$metadata.'</head></html>')]);
            $this->assertSame(['latitude' => 24.7136, 'longitude' => 46.6753],
                app(AttendanceLocationService::class)->coordinates('https://www.google.com/maps?cid=123'));
            Http::assertSentCount(1);
        }
    }

    public function test_unsafe_redirects_and_canonical_urls_are_never_requested_or_accepted(): void
    {
        foreach (['https://127.0.0.1/?q=24,46', 'https://google.com.evil.test/?q=24,46',
            'http://www.google.com/maps?q=24,46', 'https://user@www.google.com/maps?q=24,46',
            'https://www.google.com:8443/maps?q=24,46'] as $target) {
            foreach ([Http::response('', 302, ['Location' => $target]),
                Http::response('<link rel="canonical" href="'.$target.'">')] as $response) {
                Http::fake(['https://maps.app.goo.gl/example' => $response]);
                $this->assertInvalid('https://maps.app.goo.gl/example');
                Http::assertSentCount(1);
            }
        }
    }

    public function test_redirect_loops_missing_coordinates_and_network_failures_are_rejected(): void
    {
        foreach ([Http::response('', 302, ['Location' => '/example']),
            Http::response('<html>No location</html>'), Http::response('Unavailable', 503),
            Http::failedConnection()] as $response) {
            Http::fake(['https://maps.app.goo.gl/example' => $response]);
            $this->assertInvalid('https://maps.app.goo.gl/example');
            Http::assertSentCount(1);
        }
    }

    private function assertInvalid(string $url): void
    {
        try {
            app(AttendanceLocationService::class)->coordinates($url);
            $this->fail('Expected an invalid Maps URL to be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('mapsUrl', $exception->errors());
        }
    }
}
