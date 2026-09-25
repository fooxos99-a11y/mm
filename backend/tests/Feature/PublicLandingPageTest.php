<?php

namespace Tests\Feature;

use Tests\TestCase;

class PublicLandingPageTest extends TestCase
{
    public function test_public_landing_page_is_available(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }
}
