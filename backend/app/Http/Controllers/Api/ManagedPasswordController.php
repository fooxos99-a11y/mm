<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ManagedPasswordService;
use App\Support\DepartmentContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

final class ManagedPasswordController extends Controller
{
    public function __invoke(Request $request, string $type, string $id, ManagedPasswordService $passwords): JsonResponse
    {
        $password = $passwords->revealPerson($type, $id);
        Log::notice('Managed credential requested', [
            'actor_id' => $request->user()->id, 'person_type' => $type,
            'person_id' => $id, 'department_id' => DepartmentContext::id(),
        ]);

        return response()->json(['password' => $password, 'available' => $password !== null])
            ->header('Cache-Control', 'no-store, private')->header('Pragma', 'no-cache');
    }
}
