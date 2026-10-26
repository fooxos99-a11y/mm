<?php

namespace App\Console\Commands;

use App\Jobs\PrepareTrainingPdfPreview;
use App\Models\Department;
use App\Models\Media;
use App\Models\TrainingMaterial;
use App\Support\DepartmentContext;
use Illuminate\Console\Command;

class PrepareTrainingPreviews extends Command
{
    protected $signature = 'training-materials:prepare-previews {--department=} {--apply}';

    protected $description = 'Count or queue missing optimized previews; original files stay unchanged';

    public function handle(): int
    {
        $department = (string) $this->option('department');
        if (! Department::whereKey($department)->where('is_active', true)->exists()) {
            $this->error('An exact active department ID is required.');

            return self::FAILURE;
        }

        return DepartmentContext::run($department, function () use ($department): int {
            $count = 0;
            Media::query()->where('model_type', TrainingMaterial::class)->where('collection_name', 'attachments')
                ->where('mime_type', 'application/pdf')->chunkById(100, function ($items) use (&$count, $department): void {
                    foreach ($items as $media) {
                        if (in_array($media->getCustomProperty('preview_status'), ['ready', 'original', 'queued'], true)) {
                            continue;
                        }
                        $count++;
                        if ($this->option('apply')) {
                            $media->setCustomProperty('preview_status', 'queued')->save();
                            PrepareTrainingPdfPreview::dispatch((int) $media->id, $department);
                        }
                    }
                });
            $this->line(json_encode(['count' => $count, 'queued' => (bool) $this->option('apply')]));

            return self::SUCCESS;
        });
    }
}
