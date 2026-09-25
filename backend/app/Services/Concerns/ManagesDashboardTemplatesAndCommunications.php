<?php

namespace App\Services\Concerns;

use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait ManagesDashboardTemplatesAndCommunications
{
    public function createTaskTemplate(string $name, string $content = ''): array
    {
        $name = trim($name);

        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'اسم القالب مطلوب.']);
        }

        $templateId = (string) str()->uuid();
        $createdAt = now();

        DB::table('task_templates')->insert([
            'id' => $templateId,
            'name' => $name,
            'content' => $content,
            'created_at' => $createdAt,
        ]);

        return [
            'id' => $templateId,
            'name' => $name,
            'content' => $content,
            'createdAt' => $createdAt->toISOString(),
        ];
    }

    public function updateTaskTemplate(string $templateId, array $updates): void
    {
        $template = DB::table('task_templates')->where('id', $templateId)->first();

        if (! $template) {
            throw ValidationException::withMessages(['templateId' => 'القالب المحدد غير موجود.']);
        }

        $payload = [];

        if (array_key_exists('name', $updates)) {
            $name = trim((string) $updates['name']);

            if ($name === '') {
                throw ValidationException::withMessages(['name' => 'اسم القالب مطلوب.']);
            }

            $payload['name'] = $name;
        }

        if (array_key_exists('content', $updates)) {
            $payload['content'] = (string) ($updates['content'] ?? '');
        }

        if ($payload !== []) {
            DB::table('task_templates')->where('id', $templateId)->update($payload);
        }
    }

    public function createStudent(string $name, string $loginCode, string $branchCode, string $note, ?string $passwordHash): Student
    {
        return $this->studentAccountService->create($name, $loginCode, $branchCode, $note, $passwordHash);
    }

    public function loadNotifications(bool $includeAll = false): array
    {
        return $this->dashboardCommunicationService->loadNotifications($includeAll);
    }

    public function addNotification(array $input): array
    {
        return $this->dashboardCommunicationService->addNotification($input);
    }

    public function deleteNotification(string $notificationId): void
    {
        $this->dashboardCommunicationService->deleteNotification($notificationId);
    }
}
