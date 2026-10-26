<?php

namespace App\Services;

use App\Models\Department;
use App\Models\RegistrationRequest;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class StudentImportService
{
    public function __construct(
        private readonly StudentImportValidator $validator,
        private readonly StudentAccountService $accounts,
    ) {}

    public function preview(array $input): array
    {
        $data = $this->validator->validate($input);
        $department = Department::query()->findOrFail(DepartmentContext::id());
        abort_unless($department->is_active, 403);
        $payloadHash = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
        $batch = DB::table('student_import_batches')->where('department_id', $department->id)
            ->where('source_hash', $data['sourceHash'])->first();
        if ($batch && $batch->payload_hash !== $payloadHash) {
            throw ValidationException::withMessages(['sourceHash' => 'استُورد هذا الملف سابقًا ببيانات مختلفة.']);
        }

        return [
            'departmentId' => $department->id, 'departmentName' => $department->name,
            'count' => count($data['entries']), 'alreadyImported' => (bool) $batch,
            'batchId' => $batch?->id,
            'confirmation' => hash_hmac('sha256', $department->id.':'.$payloadHash, config('app.key')),
            'conflicts' => $batch ? [] : $this->validator->conflicts($data['entries']),
            'identityConflicts' => $batch ? [] : app(StudentImportIdentityMatcher::class)->conflicts($data['entries']),
            'warnings' => $this->validator->warnings($data['entries']),
            'rows' => array_map(fn (array $entry): array => [
                'sourceRow' => $entry['sourceRow'], 'name' => $entry['name'], 'loginCode' => $entry['loginCode'],
            ], $data['entries']),
        ];
    }

    public function import(array $input, string $confirmation, ?string $actorId = null): array
    {
        $data = $this->validator->validate($input);

        return DB::transaction(function () use ($data, $confirmation, $actorId): array {
            // Serializes imports within the target department; global code reservations handle other departments.
            Department::query()->whereKey(DepartmentContext::id())->lockForUpdate()->firstOrFail();
            $preview = $this->preview($data);
            if (! hash_equals($preview['confirmation'], $confirmation)) {
                throw ValidationException::withMessages(['confirmation' => 'تغيّرت المعاينة. راجع البيانات مرة أخرى.']);
            }
            if ($preview['alreadyImported']) {
                return $preview;
            }
            if ($preview['conflicts'] !== []) {
                throw ValidationException::withMessages(['entries' => 'توجد أرقام دخول مستخدمة. لم يُضف أي حساب.']);
            }
            if ($preview['identityConflicts'] !== []) {
                throw ValidationException::withMessages(['entries' => 'توجد بيانات تطابق حسابات أو صفوفًا أخرى. راجع المطابقة قبل إنشاء حساب جديد.']);
            }
            $batchId = (string) Str::uuid();
            DB::table('student_import_batches')->insert([
                'id' => $batchId, 'department_id' => DepartmentContext::id(),
                'source_hash' => $data['sourceHash'],
                'payload_hash' => hash('sha256', json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)),
                'branch_code' => $data['branchId'], 'record_count' => count($data['entries']),
                'created_by' => $actorId, 'created_at' => now(),
            ]);
            foreach ($data['entries'] as $entry) {
                $this->createEntry($batchId, $data['branchId'], $entry, $actorId);
            }

            return [...$preview, 'batchId' => $batchId, 'imported' => count($data['entries'])];
        }, 3);
    }

    private function createEntry(string $batchId, string $branch, array $entry, ?string $actorId): void
    {
        $student = $this->accounts->create($entry['name'], $entry['loginCode'], $branch, '', Hash::make($entry['password']));
        $user = User::query()->where('department_id', DepartmentContext::id())->where('login_code', $entry['loginCode'])->firstOrFail();
        if ($entry['mustChangePassword'] ?? false) {
            $user->forceFill(['must_change_password' => true])->save();
        }
        DB::table('student_initial_credentials')->insert([
            'user_id' => $user->id, 'encrypted_password' => Crypt::encryptString($entry['password']), 'created_at' => now(),
        ]);
        $answers = [];
        foreach ($entry['sourceFields'] as $index => $field) {
            $answers['import_'.$index] = [...$field, 'type' => 'text', 'showInRequests' => true];
        }
        $request = RegistrationRequest::query()->create([
            'full_name' => $entry['name'], 'login_code' => $entry['loginCode'], 'phone' => null,
            'gender' => $branch, 'answers' => $answers, 'student_id' => $student->id,
            'branch_code' => $branch, 'status' => 'accepted', 'reviewed_by' => $actorId,
            'reviewed_at' => now(), 'decision_reason' => 'إضافة من ملف تسجيل؛ حالات المصدر محفوظة ضمن البيانات.',
        ]);
        DB::table('student_import_items')->insert([
            'batch_id' => $batchId, 'student_id' => $student->id, 'user_id' => $user->id,
            'registration_id' => $request->id, 'source_row' => $entry['sourceRow'],
        ]);
    }
}
