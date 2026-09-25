<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

abstract class CoreDataApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        File::delete(storage_path('app/registration-request-metadata.json'));

        Sanctum::actingAs(User::factory()->create([
            'role' => 'admin',
            'login_code' => '9000',
        ]));
    }
}
