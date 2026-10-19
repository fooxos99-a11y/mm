<?php

namespace App\Services;

use App\Support\DepartmentData as DB;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

final class DashboardAccessHistory
{
    public function record(string $event, string $subject, array $changes = []): void
    {
        DB::table('dashboard_access_events')->insert([
            'id' => (string) Str::uuid(), 'actor_id' => auth()->id(),
            'actor_name' => auth()->user()?->full_name ?? 'النظام',
            'event' => $event, 'subject' => $subject,
            'changes' => json_encode($changes, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 'created_at' => now()->format('Y-m-d H:i:s.u'),
        ]);
    }

    public function latest(): array
    {
        return DB::table('dashboard_access_events')->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get()
            ->map(fn ($row) => ['id' => $row->id, 'actorName' => $row->actor_name, 'event' => $row->event,
                'subject' => $row->subject, 'changes' => json_decode($row->changes, true),
                'createdAt' => Carbon::parse($row->created_at)->toIso8601String()])->all();
    }
}
