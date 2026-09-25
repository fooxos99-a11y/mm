<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

class RegistrationMetadataService
{
    public function store(string $requestId, string $phone, string $gender, array $answers, ?int $legacyAge = null): void
    {
        $metadata = $this->load();
        $metadata[$requestId] = [
            'age' => $legacyAge,
            'phone' => $phone,
            'gender' => $gender,
            'answers' => $answers,
        ];

        $this->write($metadata);
    }

    public function forget(string $requestId): void
    {
        $metadata = $this->load();

        if (! array_key_exists($requestId, $metadata)) {
            return;
        }

        unset($metadata[$requestId]);
        $this->write($metadata);
    }

    public function age(string $requestId): ?int
    {
        $age = $this->load()[$requestId]['age'] ?? null;

        return is_numeric($age) ? (int) $age : null;
    }

    public function gender(string $requestId): ?string
    {
        $gender = $this->load()[$requestId]['gender'] ?? null;

        return in_array($gender, ['male', 'female'], true) ? $gender : null;
    }

    public function phone(string $requestId): ?string
    {
        $phone = (string) ($this->load()[$requestId]['phone'] ?? '');

        return preg_match('/^\d{10}$/', $phone) ? $phone : null;
    }

    public function answers(string $requestId): array
    {
        $answers = $this->load()[$requestId]['answers'] ?? [];

        return is_array($answers) ? $answers : [];
    }

    private function load(): array
    {
        if (! File::exists($this->path())) {
            return [];
        }

        $decoded = json_decode((string) File::get($this->path()), true);

        return is_array($decoded) ? $decoded : [];
    }

    private function write(array $metadata): void
    {
        File::ensureDirectoryExists(dirname($this->path()));
        File::put($this->path(), json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function path(): string
    {
        return storage_path('app/registration-request-metadata.json');
    }
}
