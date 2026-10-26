<?php

namespace App\Jobs;

use App\Models\Media;
use App\Services\TrainingPdfPreviewService;
use App\Support\DepartmentContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class PrepareTrainingPdfPreview implements ShouldQueue
{
    use Queueable;

    public int $timeout = 180;

    public int $tries = 2;

    public function __construct(public int $mediaId, public string $departmentId)
    {
        $this->onQueue(config('training-preview.queue'));
        $this->onConnection('training-previews');
        $this->afterCommit();
    }

    public function handle(TrainingPdfPreviewService $service): void
    {
        DepartmentContext::run($this->departmentId, function () use ($service): void {
            $media = Media::query()->find($this->mediaId);
            if ($media) {
                $service->prepare($media);
            }
        });
    }

    public function failed(?\Throwable $exception): void
    {
        DepartmentContext::run($this->departmentId, function (): void {
            $media = Media::query()->find($this->mediaId);
            $media?->setCustomProperty('preview_status', 'unavailable')->save();
        });
    }
}
