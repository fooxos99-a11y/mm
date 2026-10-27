<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use App\Support\DepartmentData as DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;

class AttendanceSessionService
{
    public function __construct(private readonly AppSettingsService $settings, private readonly AttendanceLocationService $location)
    {
    }

    public function settings(): array
    {
        return $this->settings->loadJson('attendance', ['enabled' => false, 'mapsUrl' => '', 'radius' => 300]);
    }

    public function saveSettings(array $data): array
    {
        $coordinates = $data['mapsUrl'] !== '' ? $this->location->coordinates($data['mapsUrl']) : [];
        if ($data['enabled'] && $coordinates === []) {
            throw ValidationException::withMessages(['mapsUrl' => 'حدد موقع التحضير.']);
        }
        $settings = [...$data, ...$coordinates];
        DB::transaction(function () use ($settings): void {
            DB::table('app_settings')->where('setting_key', 'attendance')->lockForUpdate()->first();
            $this->settings->storeJson('attendance', $settings);
        });

        return $settings;
    }

    public function sessions(string $courseId): array
    {
        $this->course($courseId);

        return DB::table('attendance_sessions')->where('course_id', $courseId)->orderByDesc('opened_at')
            ->orderByDesc('id')->get()->map(fn ($row) => $this->serialize($row))->all();
    }

    public function open(User $user, string $courseId, float $hours): array
    {
        return DB::transaction(function () use ($user, $courseId, $hours): array {
            $this->course($courseId, true);
            if (DB::table('attendance_sessions')->where('course_id', $courseId)->where('active', 1)->exists()) {
                throw ValidationException::withMessages(['session' => 'التحضير مفتوح لهذه الدورة.']);
            }
            $id = (string) str()->uuid();
            DB::table('attendance_sessions')->insert(['id' => $id, 'course_id' => $courseId,
                'hours' => $hours, 'opened_at' => now(), 'opened_by' => $user->id, 'active' => 1]);

            return $this->serialize(DB::table('attendance_sessions')->where('id', $id)->first());
        });
    }

    public function close(string $courseId, string $sessionId): void
    {
        DB::transaction(function () use ($courseId, $sessionId): void {
            $this->course($courseId, true);
            $session = $this->session($courseId, $sessionId);
            abort_unless($session->active === 1 || $session->active === '1', 422, 'التحضير مغلق.');
            DB::table('attendance_sessions')->where('id', $sessionId)->update(['active' => null, 'closed_at' => now()]);
        });
    }

    public function available(User $user): array
    {
        $student = $this->student($user);
        if (! ($this->settings()['enabled'] ?? false)) {
            return [];
        }

        return DB::table('attendance_sessions')->where('active', 1)
            ->whereIn('course_id', DB::table('course_enrollments')->where('student_id', $student->id)->select('course_id'))
            ->get()->filter(function ($session): bool {
                return DB::table('courses')->where('id', $session->course_id)->whereNull('archive_id')
                    ->where('entity_type', '!=', 'task')->exists();
            })->map(fn ($session) => [...$this->serialize($session),
                'title' => DB::table('courses')->where('id', $session->course_id)->value('title'),
                'attended' => DB::table('course_attendance')->where('session_id', $session->id)
                    ->where('student_id', $student->id)->exists(),
            ])->values()->all();
    }

    public function challenge(User $user, string $courseId, string $sessionId): string
    {
        $student = $this->student($user);
        $this->course($courseId);
        app(CourseEnrollmentService::class)->assertEnrolled($courseId, $student->id);
        $this->session($courseId, $sessionId);
        abort_unless(($this->settings()['enabled'] ?? false), 403);

        return Crypt::encryptString(json_encode(['user' => $user->id, 'session' => $sessionId,
            'department' => DepartmentContext::id(), 'issued' => now()->timestamp]));
    }

    public function attend(User $user, string $courseId, string $sessionId, array $data): void
    {
        DB::transaction(function () use ($user, $courseId, $sessionId, $data): void {
            $this->course($courseId, true);
            $session = $this->session($courseId, $sessionId);
            DB::table('app_settings')->where('setting_key', 'attendance')->lockForUpdate()->first();
            abort_unless(($this->settings()['enabled'] ?? false), 403);
            $student = $this->student($user);
            app(CourseEnrollmentService::class)->assertEnrolled($courseId, $student->id);
            try {
                $token = json_decode(Crypt::decryptString($data['challenge']), true, flags: JSON_THROW_ON_ERROR);
            } catch (\Throwable) {
                abort(422, 'تعذر التحقق من الموقع.');
            }
            abort_unless(($token['user'] ?? null) === $user->id && ($token['session'] ?? null) === $sessionId
                && ($token['department'] ?? null) === DepartmentContext::id()
                && ($token['issued'] ?? 0) >= now()->timestamp - 60 && $token['issued'] <= now()->timestamp, 422);
            $this->location->assertInside($this->settings(), $data, $token['issued']);
            $this->record($student, $session, 'student');
        });
    }

    public function record(Student $student, object $session, string $source): void
    {
        if (DB::table('course_attendance')->where('session_id', $session->id)->where('student_id', $student->id)->exists()) {
            throw ValidationException::withMessages(['attendance' => 'تم تسجيل الحضور مسبقًا.']);
        }
        DB::table('course_attendance')->insert(['id' => (string) str()->uuid(), 'course_id' => $session->course_id,
            'session_id' => $session->id, 'hours' => $session->hours, 'student_id' => $student->id,
            'student_name' => $student->full_name, 'login_code' => $student->login_code, 'source' => $source, 'created_at' => now()]);
    }

    public function session(string $courseId, string $sessionId): object
    {
        $session = DB::table('attendance_sessions')->where('course_id', $courseId)->where('id', $sessionId)->first();
        abort_unless($session && (int) $session->active === 1, 422, 'التحضير مغلق.');

        return $session;
    }

    private function course(string $id, bool $lock = false): object
    {
        $query = DB::table('courses')->where('id', $id)->whereNull('archive_id')->where('entity_type', '!=', 'task');
        $course = ($lock ? $query->lockForUpdate() : $query)->first();
        abort_unless($course, 404);

        return $course;
    }

    private function student(User $user): Student
    {
        abort_unless($user->role === 'student' && $user->is_active, 403);
        $student = Student::query()->where('login_code', $user->login_code)->whereNull('archive_id')->first();
        abort_unless($student && $student->branch_id, 403);

        return $student;
    }

    private function serialize(object $session): array
    {
        return ['id' => $session->id, 'courseId' => $session->course_id, 'hours' => (float) $session->hours,
            'openedAt' => Carbon::parse($session->opened_at)->toISOString(),
            'closedAt' => $session->closed_at ? Carbon::parse($session->closed_at)->toISOString() : null,
            'isOpen' => (int) $session->active === 1];
    }
}
