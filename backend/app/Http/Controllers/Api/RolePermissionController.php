<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CoreDataService;
use Illuminate\Http\JsonResponse;

class RolePermissionController extends Controller
{
    public function __construct(private readonly CoreDataService $coreDataService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->coreDataService->loadRolePermissions());
    }

    public function editor(): JsonResponse
    {
        abort(410, 'استُبدلت الصلاحيات اليدوية بصلاحيات تلقائية لكل فرع.');
    }

    public function save(): JsonResponse
    {
        abort(410, 'استُبدلت الصلاحيات اليدوية بصلاحيات تلقائية لكل فرع.');
    }

    public function update(): JsonResponse
    {
        abort(410, 'استُبدلت الصلاحيات اليدوية بصلاحيات تلقائية لكل فرع.');
    }
}
