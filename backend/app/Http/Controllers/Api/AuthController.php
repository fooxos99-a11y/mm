<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $rateLimitKey = Str::lower(trim((string) $credentials['login_code'])).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($rateLimitKey, 5)) {
            return response()->json([
                'message' => 'محاولات دخول كثيرة. حاول مرة أخرى بعد قليل.',
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $user = User::query()->where('login_code', $credentials['login_code'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password ?? '')) {
            RateLimiter::hit($rateLimitKey, 60);

            throw ValidationException::withMessages([
                'login_code' => ['بيانات الدخول غير صحيحة.'],
            ]);
        }

        RateLimiter::clear($rateLimitKey);

        $payload = [
            'user' => $this->serializeUser($user),
        ];

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        } else {
            $payload['token'] = $user->createToken('spa')->plainTextToken;
        }

        return response()->json($payload);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($this->serializeUser($request->user()));
    }

    public function session(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');

        return response()->json([
            'user' => $user ? $this->serializeUser($user) : null,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(status: 204);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        if ($user?->role === 'student') {
            return response()->json([
                'message' => 'بيانات دخول الطالب يحددها المسؤول فقط.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $user || ! Hash::check($data['currentPassword'], $user->password ?? '')) {
            throw ValidationException::withMessages([
                'currentPassword' => ['كلمة المرور الحالية غير صحيحة.'],
            ]);
        }

        if (Hash::check($data['password'], $user->password ?? '')) {
            throw ValidationException::withMessages([
                'password' => ['يجب أن تختلف كلمة المرور الجديدة عن الحالية.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'must_change_password' => false,
        ])->save();

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'تم تغيير كلمة المرور. سجل الدخول بالبيانات الجديدة.',
        ]);
    }

    /**
     * @return array<string, string|bool>
     */
    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->full_name,
            'role' => $user->role,
            'loginCode' => $user->login_code ?? '',
            'mustChangePassword' => (bool) $user->must_change_password,
        ];
    }
}
