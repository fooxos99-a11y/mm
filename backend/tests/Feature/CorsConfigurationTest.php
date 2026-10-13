<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CorsConfigurationTest extends TestCase
{
    public function test_signed_attachment_allows_the_frontend_origin_without_bypassing_signatures(): void
    {
        $path = 'assessment-attachments/'.str()->uuid().'.txt';
        Storage::disk('local')->put($path, 'Submitted answer');
        try {
            $url = Storage::disk('local')->temporaryUrl($path, now()->addMinutes(5));
            $this->withHeader('Origin', 'http://127.0.0.1:8080')->get($url)
                ->assertOk()->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:8080');
            $this->withHeader('Origin', 'https://unapproved.example.test')->get($url)
                ->assertHeaderMissing('Access-Control-Allow-Origin');
            $this->withHeader('Origin', 'http://127.0.0.1:8080')->get('/storage/'.$path)
                ->assertForbidden();
        } finally {
            Storage::disk('local')->delete($path);
        }
    }

    public function test_allowed_local_origin_receives_credentialed_preflight_headers(): void
    {
        $origin = 'http://127.0.0.1:8080';

        $response = $this->withHeaders([
            'Origin' => $origin,
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'authorization,content-type',
        ])->options('/api/auth/login');

        $response
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', $origin)
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    public function test_unapproved_origin_does_not_receive_allow_origin_header(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://unapproved.example.test',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'authorization,content-type',
        ])->options('/api/auth/login');

        $response
            ->assertNoContent()
            ->assertHeaderMissing('Access-Control-Allow-Origin');
    }
}
