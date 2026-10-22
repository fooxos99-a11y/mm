<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

final class StudentInitialPasswordController extends Controller
{
    public function __invoke(Request $request, Student $student): JsonResponse
    {
        abort_unless($student->department_id === DepartmentContext::id() && $student->archive_id === null, 404);
        $user = User::query()->where('department_id', DepartmentContext::id())
            ->where('login_code', $student->login_code)->whereIn('role', ['student', 'trainee'])->first();
        $encrypted = $user ? DB::table('student_initial_credentials')->where('user_id', $user->id)->value('encrypted_password') : null;
        $password = $encrypted ? Crypt::decryptString($encrypted) : null;
        if ($password !== null && ! Hash::check($password, $user->password)) {
            $password = null;
        }
        Log::notice('Student initial credential requested', [
            'actor_id' => $request->user()->id, 'student_id' => $student->id, 'department_id' => DepartmentContext::id(),
        ]);

        return response()->json(['password' => $password, 'available' => $password !== null])
            ->header('Cache-Control', 'no-store, private')->header('Pragma', 'no-cache');
    }
}
