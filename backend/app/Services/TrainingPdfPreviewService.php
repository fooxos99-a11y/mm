<?php

namespace App\Services;

use App\Models\Media;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;
use Throwable;

class TrainingPdfPreviewService
{
    public function path(Media $media): string
    {
        return dirname($media->getPath()).DIRECTORY_SEPARATOR.'training-preview.pdf';
    }

    public function prepare(Media $media): void
    {
        if ($media->mime_type !== 'application/pdf') {
            return;
        }
        $lock = Cache::lock('training-preview:'.$media->id, 200);
        if (! $lock->get()) {
            return;
        }
        $output = $this->path($media);
        $temporary = $output.'.'.bin2hex(random_bytes(6)).'.pdf';
        try {
            $process = new Process([
                (string) config('training-preview.qpdf'),
                '--linearize', '--object-streams=generate', '--recompress-flate',
                '--compression-level=9', '--optimize-images',
                $media->getPath(), $temporary,
            ]);
            $process->setTimeout(160);
            $process->mustRun();
            $size = is_file($temporary) ? filesize($temporary) : 0;
            if ($size > 5 && $size < filesize($media->getPath())
                && file_get_contents($temporary, false, null, 0, 5) === '%PDF-') {
                chmod($temporary, 0640);
                File::move($temporary, $output);
                $status = 'ready';
            } else {
                $status = 'original';
            }
        } catch (Throwable) {
            // The original remains usable even if conversion is unavailable.
            $status = 'unavailable';
        } finally {
            File::delete($temporary);
            $lock->release();
        }
        $fresh = $media->fresh();
        if (! $fresh) {
            File::delete($output);

            return;
        }
        $fresh->setCustomProperty('preview_status', $status)->save();
    }
}
