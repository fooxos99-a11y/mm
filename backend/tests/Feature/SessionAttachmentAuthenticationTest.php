<?php

namespace Tests\Feature;

use App\Models\TrainingMaterial;
use App\Models\User;
use App\Services\AssessmentAttachmentService;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

final class SessionAttachmentAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
        config(['session.driver' => 'database', 'session.lottery' => [0, 100]]);
        $this->withCredentials();
        $this->forgetRequestAuthentication();
        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    public function test_real_session_cookie_downloads_private_files_without_origin_or_referer(): void
    {
        $assessment = $this->assessmentUrl();
        $training = $this->trainingUrl();
        $cookie = $this->loginCookie();

        $this->forgetRequestAuthentication();
        $this->withUnencryptedCookie(config('session.cookie'), $cookie)->get($assessment)->assertOk();
        $this->forgetRequestAuthentication();
        $this->head($assessment)->assertOk();
        $this->forgetRequestAuthentication();
        $this->get($training)->assertOk();
    }

    public function test_invalid_or_absent_session_cookie_cannot_download_private_files(): void
    {
        $assessment = $this->assessmentUrl();
        $training = $this->trainingUrl();
        $cookie = $this->loginCookie();
        $this->forgetRequestAuthentication();
        $this->get($assessment)->assertUnauthorized();
        $this->forgetRequestAuthentication();
        $this->get($training)->assertUnauthorized();

        $this->forgetRequestAuthentication();
        $this->withUnencryptedCookie(config('session.cookie'), $cookie.'invalid')->get($assessment)->assertUnauthorized();
        $this->forgetRequestAuthentication();
        $this->get($training)->assertUnauthorized();
    }

    public function test_foreign_origin_or_referer_cannot_restore_cookie_authentication(): void
    {
        $assessment = $this->assessmentUrl();
        $training = $this->trainingUrl();
        $cookie = $this->loginCookie();
        $this->withUnencryptedCookie(config('session.cookie'), $cookie);

        foreach ([['Origin' => 'https://foreign.example'], ['Referer' => 'https://foreign.example/page']] as $headers) {
            $this->forgetRequestAuthentication();
            $this->get($assessment, $headers)->assertUnauthorized();
            $this->forgetRequestAuthentication();
            $this->get($training, $headers)->assertUnauthorized();
        }
    }

    public function test_session_cookie_does_not_bypass_signature_or_widen_other_api_routes(): void
    {
        $assessment = $this->assessmentUrl();
        $cookie = $this->loginCookie();
        $this->withUnencryptedCookie(config('session.cookie'), $cookie);
        $this->forgetRequestAuthentication();
        $this->get(strtok($assessment, '?'))->assertForbidden();
        $this->forgetRequestAuthentication();
        $this->getJson('/api/auth/user')->assertUnauthorized();
        $this->forgetRequestAuthentication();
        $this->postJson('/api/dashboard/courses', ['title' => 'غير مسموح'])->assertUnauthorized();
        $this->assertDatabaseMissing('courses', ['title' => 'غير مسموح']);
    }

    /** Create an actual encrypted Set-Cookie through the normal stateful login. */
    private function loginCookie(): string
    {
        $this->forgetRequestAuthentication();
        $user = User::factory()->create(['role' => 'admin', 'login_code' => 'session-attachment', 'password' => '12345678']);
        $response = $this->postJson('/api/auth/login', [
            'login_code' => $user->login_code, 'password' => '12345678',
        ], ['Referer' => 'http://127.0.0.1:8080'])->assertOk()->assertJsonMissingPath('token');
        $cookie = $response->getCookie(config('session.cookie'), false);
        $this->assertNotNull($cookie);
        $this->assertDatabaseHas('sessions', ['user_id' => $user->id]);

        return $cookie->getValue();
    }

    /** Simulate a new PHP request; do not let cached guards supply authentication. */
    private function forgetRequestAuthentication(): void
    {
        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');
        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');
    }

    private function assessmentUrl(): string
    {
        $course = (string) Str::uuid();
        $path = 'assessment-attachments/session-question.pdf';
        Storage::disk('local')->put($path, '%PDF-1.4 private');
        DB::table('courses')->insert(['id' => $course, 'title' => 'دورة مرفق']);
        DB::table('course_questions')->insert([
            'id' => (string) Str::uuid(), 'course_id' => $course, 'assessment_type' => 'pre',
            'question_type' => 'text', 'prompt' => 'سؤال', 'attachment_path' => $path,
        ]);

        return app(AssessmentAttachmentService::class)->temporaryUrl($path);
    }

    private function trainingUrl(): string
    {
        $material = TrainingMaterial::create(['title' => 'مادة خاصة']);
        $media = $material->addMediaFromString('%PDF-1.4 private')->usingFileName('training.pdf')
            ->toMediaCollection('attachments', 'local');

        return '/api/training-material-attachments/'.$media->uuid;
    }
}
