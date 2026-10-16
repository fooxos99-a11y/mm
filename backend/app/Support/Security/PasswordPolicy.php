<?php

namespace App\Support\Security;

use Illuminate\Validation\Rules\Password;

final class PasswordPolicy
{
    public const LENGTH = 8;

    private function __construct()
    {
    }

    public static function rule(): Password
    {
        return Password::min(self::LENGTH)
            ->max(self::LENGTH)
            ->rules(['regex:/\A\p{Nd}+\z/u']);
    }
}
