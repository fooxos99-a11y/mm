<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PruneRetainedData extends Command
{
    protected $signature = 'data-retention:prune {--dry-run : Report eligible rows without deleting them}';

    protected $description = 'Apply the documented retention period to rejected registrations';

    public function handle(): int
    {
        $targets = [
            'rejected registrations' => DB::table('registration_requests')
                ->where('status', 'rejected')
                ->where('updated_at', '<', now()->subDays(90)),
        ];

        $total = 0;
        foreach ($targets as $label => $query) {
            $count = (clone $query)->count();
            $total += $count;
            $this->line("{$label}: {$count}");

            if (! $this->option('dry-run') && $count > 0) {
                $query->delete();
            }
        }

        $this->info($this->option('dry-run')
            ? "Dry run complete; {$total} rows are eligible."
            : "Retention pruning complete; {$total} rows deleted.");

        return self::SUCCESS;
    }
}
