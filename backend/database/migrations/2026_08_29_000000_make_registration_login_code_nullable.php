<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registration_requests', function (Blueprint $table): void {
            $table->string('login_code')->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('registration_requests')->whereNull('login_code')->get(['id'])->each(
            fn (object $request) => DB::table('registration_requests')->where('id', $request->id)->update([
                'login_code' => 'pending-'.$request->id,
            ]),
        );

        Schema::table('registration_requests', function (Blueprint $table): void {
            $table->string('login_code')->nullable(false)->change();
        });
    }
};
