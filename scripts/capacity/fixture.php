<?php

// Only the disposable database started by run-local.mjs is allowed.
if (getenv('DB_DATABASE') !== 'momars_capacity' || getenv('DB_HOST') !== '127.0.0.1'
    || getenv('DB_PORT') !== getenv('CAPACITY_DB_PORT') || ! getenv('CAPACITY_RUN_DIR')) {
    throw new RuntimeException('Capacity fixture requires the isolated local runner.');
}

$root = dirname(__DIR__, 2);
require $root.'/backend/vendor/autoload.php';
$app = require $root.'/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
set_exception_handler(function (Throwable $error): void {
    // SQL bindings and generated credentials must not enter capacity reports.
    $message = explode(' (Connection:', $error->getMessage())[0];
    fwrite(STDERR, get_class($error).': '.$message.PHP_EOL);
    exit(1);
});

use App\Models\Branch;
use App\Services\CourseManagementService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

$action = $argv[1] ?? 'seed';
if ($action === 'verify') {
    $courses = DB::table('courses')->where('title', 'like', 'Capacity wave %')->pluck('id');
    $submissions = DB::table('course_submissions')->whereIn('course_id', $courses)->get();
    echo json_encode([
        'submissions' => $submissions->count(),
        'answers' => DB::table('course_submission_answers')->whereIn('submission_id', $submissions->pluck('id'))->count(),
        'duplicates' => $submissions->groupBy(fn ($row) => $row->course_id.'|'.$row->login_code)
            ->filter(fn ($group) => $group->count() > 1)->count(),
        'incomplete' => $submissions->filter(fn ($row) => DB::table('course_submission_answers')
            ->where('submission_id', $row->id)->count() !== 20)->count(),
    ]);
    exit;
}

$manager = app(CourseManagementService::class);
if ($action === 'wave') {
    $type = getenv('CAPACITY_ASSESSMENT_TYPE') ?: 'pre';
    if (! in_array($type, ['pre', 'post', 'tasks'], true)) throw new RuntimeException('Invalid capacity assessment type.');
    $course = $manager->createCourse('Capacity wave '.getenv('CAPACITY_WAVE'), false);
    if ($type === 'tasks') DB::table('courses')->where('id', $course['id'])->update(['is_tasks_enabled' => true]);
    $questions = [];
    for ($index = 0; $index < 20; $index++) {
        $questions[] = $manager->addCourseQuestion($course['id'], $type, [
            'prompt' => 'Capacity question '.$index, 'type' => 'multiple',
            'options' => ['أ', 'ب', 'ج', 'د'], 'correctAnswer' => 'أ', 'points' => 1, 'allowFile' => false,
        ]);
    }
    echo json_encode(['courseId' => $course['id'], 'assessmentType' => $type, 'questionIds' => $questions]);
    exit;
}

$branches = [];
foreach (['male', 'female'] as $code) {
    $branches[] = Branch::query()->where('code', $code)->firstOrFail()->id;
}
$password = Hash::make(getenv('CAPACITY_PASSWORD'));
$users = [];
$students = [];
$count = (int) getenv('CAPACITY_USERS');
for ($index = 0; $index < $count; $index++) {
    $login = 'capacity-'.str_pad((string) $index, 5, '0', STR_PAD_LEFT);
    $users[] = ['id' => (string) str()->uuid(), 'full_name' => 'Capacity student '.$index, 'role' => 'student',
        'login_code' => $login, 'password' => $password, 'must_change_password' => false,
        'created_at' => now(), 'updated_at' => now()];
    $students[] = ['id' => (string) str()->uuid(), 'full_name' => 'Capacity student '.$index,
        'login_code' => $login, 'branch_id' => $branches[$index % 2], 'is_certified' => false, 'created_at' => now()];
}
foreach (array_chunk($users, 200) as $batch) DB::table('users')->insert($batch);
foreach (array_chunk($students, 200) as $batch) DB::table('students')->insert($batch);
for ($index = 0; $index < 30; $index++) {
    $course = $manager->createCourse('Capacity background '.$index, false);
    for ($question = 0; $question < 20; $question++) {
        $manager->addCourseQuestion($course['id'], 'pre', [
            'prompt' => 'Background question '.$question, 'type' => 'multiple', 'options' => ['أ', 'ب'],
            'correctAnswer' => 'أ', 'points' => 1, 'allowFile' => false,
        ]);
    }
}
echo json_encode(['users' => $count, 'backgroundCourses' => 30, 'questionsPerExam' => 20]);
