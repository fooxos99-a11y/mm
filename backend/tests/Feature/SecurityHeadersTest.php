<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_include_baseline_security_headers(): void
    {
        $this->getJson('/api/public/stats')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
            ->assertHeader('Cross-Origin-Opener-Policy', 'same-origin')
            ->assertHeader(
                'Content-Security-Policy',
                "default-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"
            );
    }

    public function test_hsts_is_only_added_to_https_responses(): void
    {
        $this->getJson('/api/public/stats')
            ->assertHeaderMissing('Strict-Transport-Security');

        $this->withServerVariables(['HTTPS' => 'on', 'SERVER_PORT' => 443])
            ->getJson('https://localhost/api/public/stats')
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    public function test_status_page_csp_allows_its_styles_but_blocks_scripts_and_objects(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertHeader(
                'Content-Security-Policy',
                "default-src 'self'; base-uri 'self'; connect-src 'self' https: wss:; font-src 'self' data:; "
                    ."form-action 'self'; frame-ancestors 'self'; frame-src 'self' blob: https://www.youtube.com "
                    ."https://www.youtube-nocookie.com; img-src 'self' data: blob: https:; media-src 'self' blob: "
                    ."https:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src "
                    ."'self' blob:",
            );
    }
}
