<?php

namespace Tests\Feature;

use App\Http\Requests\Auth\RegisterAccountRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\CoreData\StoreDashboardAccountRequest;
use App\Http\Requests\CoreData\StoreReciterRequest;
use App\Http\Requests\CoreData\StoreStudentRequest;
use App\Http\Requests\CoreData\UpdateStudentRequest;
use App\Http\Requests\Registration\AcceptRegistrationRequest;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CredentialPolicyTest extends TestCase
{
    public static function requests(): array
    {
        return [
            [RegisterAccountRequest::class],
            [UpdatePasswordRequest::class],
            [StoreDashboardAccountRequest::class],
            [StoreStudentRequest::class],
            [UpdateStudentRequest::class],
            [StoreReciterRequest::class],
            [AcceptRegistrationRequest::class],
        ];
    }

    #[DataProvider('requests')]
    public function test_new_credentials_accept_short_numbers_letters_and_symbols(string $request): void
    {
        $rules = ['password' => (new $request)->rules()['password']];
        foreach ([str_repeat('a', 256), ['invalid']] as $password) {
            $this->assertTrue(
                Validator::make(['password' => $password, 'passwordConfirmation' => $password], $rules)->fails()
            );
        }
        if (in_array('required', $rules['password'], true)) {
            $this->assertTrue(Validator::make(['password' => ' ', 'passwordConfirmation' => ' '], $rules)->fails());
        }
        foreach (['0', '1', '12', 'a', 'ab', 'ع', 'سع', '!', 'a !', ' a ', '01234567', '٠١٢٣٤٥٦٧', '123456789'] as $password) {
            $this->assertTrue(Validator::make([
                'password' => $password, 'passwordConfirmation' => $password,
            ], $rules)->passes());
        }
    }

    #[DataProvider('requests')]
    public function test_login_codes_accept_one_character_and_still_reject_blank_values(string $request): void
    {
        $requestRules = (new $request)->rules();
        $key = isset($requestRules['loginCode']) ? 'loginCode' : 'loginId';
        if (! isset($requestRules[$key])) {
            $this->assertArrayNotHasKey('loginCode', $requestRules);

            return;
        }
        $rules = [$key => $requestRules[$key]];
        foreach (['0', '1', '12', 'a', 'ab', 'ع', '!', 'name @'] as $loginCode) {
            $this->assertTrue(Validator::make([$key => $loginCode], $rules)->passes());
        }
        foreach (['', ' '] as $loginCode) {
            $this->assertTrue(Validator::make([$key => $loginCode], $rules)->fails());
        }
    }
}
