<?php

namespace App\Support\Security;

use Illuminate\Validation\Rules\Password;

final class PasswordPolicy
{
    public const MIN_LENGTH = 10;

    private function __construct() {}

    public static function rule(): Password
    {
        return Password::min(self::MIN_LENGTH)
            ->letters()
            ->numbers();
    }
}
