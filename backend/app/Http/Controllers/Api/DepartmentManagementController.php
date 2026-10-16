<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DepartmentDirectoryService;
use App\Services\DepartmentManagementService;
use App\Support\DepartmentContext;
use App\Support\UserPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DepartmentManagementController extends Controller
{
    public function __construct(private readonly DepartmentDirectoryService $directory)
    {
    }

    public function index(DepartmentManagementService $service): JsonResponse
    {
        return response()->json(['departments' => $service->list()]);
    }

    public function store(Request $request, DepartmentManagementService $service): JsonResponse
    {
        return response()->json(['department' => $service->save($this->validated($request))], 201);
    }

    public function update(Request $request, string $departmentId, DepartmentManagementService $service): JsonResponse
    {
        return response()->json(['department' => $service->save($this->validated($request), $departmentId)]);
    }

    public function accounts(Request $request, DepartmentManagementService $service): JsonResponse
    {
        $data = $request->validate(['loginCode' => ['required', 'string', 'max:100']]);

        return response()->json(['accounts' => $service->accounts($data['loginCode'])]);
    }

    public function context(Request $request): JsonResponse
    {
        $data = $request->validate(['departmentId' => ['present', 'nullable', 'uuid']]);
        $id = $data['departmentId'];
        $this->directory->assertActive($id);
        if ($request->hasSession()) {
            $request->session()->put('management_department_id', $id);
        }
        DepartmentContext::set($id);

        return response()->json(['user' => UserPresenter::serialize($request->user())]);
    }

    public function overview(DepartmentManagementService $service): JsonResponse
    {
        return response()->json($service->overview());
    }

    public function archives(Request $request): JsonResponse
    {
        $data = $request->validate(['departmentId' => ['nullable', 'uuid'], 'search' => ['nullable', 'string', 'max:255']]);

        return response()->json($this->directory->archives($data['departmentId'] ?? null, $data['search'] ?? null));
    }

    public function archive(string $archiveId): JsonResponse
    {
        return response()->json($this->directory->archive($archiveId));
    }

    public function records(Request $request): JsonResponse
    {
        $data = $request->validate([
            'departmentId' => ['nullable', 'uuid'], 'archiveId' => ['nullable', 'uuid'],
            'batch' => ['sometimes', 'in:current,archived,all'],
            'search' => ['nullable', 'string', 'max:255'], 'page' => ['sometimes', 'integer', 'min:1', 'max:100000'],
        ]);

        return response()->json($this->directory->records($data));
    }

    public function currentStudent(string $studentId): JsonResponse
    {
        return response()->json($this->directory->currentStudent($studentId));
    }

    public function searchStudents(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'departmentId' => ['nullable', 'uuid']]);

        return response()->json($this->directory->searchStudents($data['name'], $data['departmentId'] ?? null));
    }

    public function student(string $archiveId, string $studentId): JsonResponse
    {
        return response()->json($this->directory->student($archiveId, $studentId));
    }

    public function publicDepartments(): JsonResponse
    {
        return response()->json(['departments' => $this->directory->publicDepartments()]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'], 'managerTitle' => ['required', 'string', 'max:100'],
            'managerLoginCode' => ['required', 'string', 'max:100'], 'isActive' => ['sometimes', 'boolean'],
        ]);
    }
}
