<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('value')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        Schema::create('registration_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('login_code');
            $table->string('branch_code');
            $table->text('note')->nullable();
            $table->string('status')->default('pending');
            $table->text('decision_reason')->nullable();
            $table->uuid('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('login_code');
        });

        DB::table('registration_settings')->insert([
            'key' => 'is_open',
            'value' => '0',
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_requests');
        Schema::dropIfExists('registration_settings');
    }
};
