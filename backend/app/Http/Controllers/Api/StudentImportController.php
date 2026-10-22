<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StudentImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class StudentImportController extends Controller
{
    public function preview(Request $request, StudentImportService $service): JsonResponse
    {
        return response()->json($service->preview($request->all()))->header('Cache-Control', 'no-store');
    }

    public function store(Request $request, StudentImportService $service): JsonResponse
    {
        $confirmation = $request->validate(['confirmation' => ['required', 'string', 'size:64']])['confirmation'];

        return response()->json($service->import($request->all(), $confirmation, $request->user()->id))
            ->header('Cache-Control', 'no-store');
    }
}
