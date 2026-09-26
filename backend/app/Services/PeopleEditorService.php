<?php

namespace App\Services;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class PeopleEditorService
{
    public function __construct(private readonly RegistrationService $registration)
    {
    }

    private function query(User $user, string $type): Builder
    {
        abort_unless(in_array($user->role, ['admin', 'male_manager', 'female_manager'], true), 403);
        $query = $type === 'reciter' ? Reciter::query()->with('user') : Student::query();
        $query->whereNull('archive_id')->with('branch');
        if ($user->role !== 'admin') {
            $branch = $user->role === 'male_manager' ? 'male' : 'female';
            $query->whereHas('branch', fn ($query) => $query->where('code', $branch));
        }

        return $query;
    }

    public function options(User $user, array $filters): array
    {
        $type = $filters['type'] ?? 'student';
        $branch = $filters['branchCode'] ?? ($user->role === 'female_manager' ? 'female' : 'male');
        abort_if($user->role !== 'admin' && $branch !== ($user->role === 'female_manager' ? 'female' : 'male'), 403);
        $query = $this->query($user, $type)->whereHas('branch', fn ($query) => $query->where('code', $branch));
        $search = trim($filters['search'] ?? '');
        if ($search !== '') {
            $query->where(function ($query) use ($search, $type) {
                $query->where('full_name', 'like', '%'.$search.'%');
                if ($type === 'reciter') {
                    $query->orWhereHas('user', fn ($query) => $query->where('login_code', 'like', '%'.$search.'%'));
                } else {
                    $query->orWhere('login_code', 'like', '%'.$search.'%');
                }
            });
        }
        $page = $query->orderBy('full_name')->orderBy('id')->paginate((int) ($filters['perPage'] ?? 20));
        $page->setCollection($page->getCollection()->map(fn ($person) => [
            'value' => $person->id,
            'label' => $person->full_name.' - '
                .($type === 'reciter' ? $person->user?->login_code : $person->login_code),
        ]));

        return $page->toArray();
    }

    public function detail(User $user, string $type, string $id): array
    {
        $person = $this->query($user, $type)->findOrFail($id);
        $record = ['id' => $person->id, 'name' => $person->full_name, 'branchId' => $person->branch->code];
        if ($type === 'reciter') {
            return [...$record, 'loginCode' => $person->user?->login_code,
                'studentIds' => $person->students()->whereNull('students.archive_id')->pluck('students.id')->all()];
        }

        return [...$record, 'loginId' => $person->login_code, 'note' => $person->note,
            'completedParts' => $person->parts()->pluck('part_number')->all(),
            'reciterId' => $person->reciters()->whereNull('reciters.archive_id')->value('reciters.id'),
            'registrationProfile' => $this->registration->serializeStudentRegistrationProfile(
                $person->registrationRequest
            )];
    }
}
