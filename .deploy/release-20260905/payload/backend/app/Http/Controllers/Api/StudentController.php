<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreStudentRequest;
use App\Http\Requests\CoreData\ToggleStudentPartRequest;
use App\Http\Requests\CoreData\TransferStudentRequest;
use App\Http\Requests\CoreData\UpdateStudentRequest;
use App\Models\Student;
use App\Services\CompletionRequirementsService;
use App\Services\CoreDataService;
use App\Services\ReciterAccessService;
use App\Services\UserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class StudentController extends Controller
{
    public function __construct(
        private readonly CoreDataService $coreDataService,
        private readonly CompletionRequirementsService $completionRequirementsService,
        private readonly ReciterAccessService $reciterAccessService,
        private readonly UserManagementService $userManagementService,
    ) {}

    public function indicators(Request $request): JsonResponse
    {
        return response()->json($this->completionRequirementsService->studentPayload($request->user()));
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $student = $this->coreDataService->createStudent(
            $data['name'],
            $data['loginId'],
            $data['branchId'],
            $data['note'] ?? '',
            filled($data['password'] ?? null) ? Hash::make($data['password']) : null,
        );

        return response()->json($this->studentData($student), 201);
    }

    public function update(UpdateStudentRequest $request, Student $student): JsonResponse
    {
        $student = $this->userManagementService->updateStudent($student, $request->validated());

        return response()->json([
            ...$this->studentData($student),
            'completedParts' => $student->parts->pluck('part_number')->sort()->values()->all(),
        ]);
    }

    public function destroy(Student $student): JsonResponse
    {
        $this->userManagementService->deleteStudent($student);

        return response()->json(status: 204);
    }

    public function transfer(TransferStudentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->userManagementService->transferStudentToReciter($data['studentId'], $data['targetReciterId']);

        return response()->json(status: 204);
    }

    public function togglePart(ToggleStudentPartRequest $request, Student $student, int $partNumber): JsonResponse
    {
        $data = $request->validated();
        $reciterId = $data['reciterId'] ?? null;
        $this->reciterAccessService->assertCanToggleStudentPart($request->user(), $student, $reciterId);
        $this->userManagementService->toggleStudentPart($student->id, $reciterId, $partNumber, $data['shouldMarkComplete']);

        return response()->json(status: 204);
    }

    private function studentData(Student $student): array
    {
        return [
            'id' => $student->id,
            'name' => $student->full_name,
            'loginId' => $student->login_code,
            'branchId' => $student->branch?->code,
            'note' => $student->note,
            'isCertified' => $student->is_certified,
        ];
    }
}
