<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->timestamp('last_login_at')->nullable());
        Schema::create('dashboard_access_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('department_id')->index();
            $table->uuid('actor_id')->nullable();
            $table->string('actor_name');
            $table->string('event');
            $table->string('subject');
            $table->json('changes');
            $table->timestamp('created_at', 6)->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_access_events');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('last_login_at'));
    }
};
