<?php

namespace App\Support\Security;

final class PermissionCatalog
{
    public static function data(): array
    {
        static $data;

        return $data ??= json_decode(file_get_contents(resource_path('permissions/catalog.json')), true, 512, JSON_THROW_ON_ERROR);
    }

    public static function entries(): array
    {
        return array_column(array_merge(...array_column(self::data()['groups'], 'permissions')), null, 'key');
    }

    public static function forRole(string $role): array
    {
        if (! in_array($role, ['male_manager', 'female_manager'], true)) {
            return [];
        }

        return array_map(fn (array $entry): bool => ! ($entry['readOnly'] ?? false), self::entries());
    }

    public static function expand(array $values): array
    {
        foreach (self::entries() as $key => $entry) {
            if (! array_key_exists($key, $values) && isset($entry['inherit'])) {
                $values[$key] = (bool) ($values[$entry['inherit']] ?? false);
            }
            // Existing action grants remain valid; new granular grants require their page.
            if (isset($entry['inherit'], $entry['parent']) && array_key_exists($entry['parent'], $values) && ! $values[$entry['parent']]) {
                $values[$key] = false;
            }
            if ($entry['readOnly'] ?? false) {
                $values[$key] = false;
            }
        }

        return $values;
    }
}
