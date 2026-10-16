<?php

namespace App\Console\Commands;

use App\Models\Media;
use App\Models\TrainingMaterial;
use App\Support\DepartmentContext;
use Illuminate\Console\Command;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

final class SecureLegacyTrainingMedia extends Command
{
    protected $signature = 'department:secure-legacy-media
        {--department= : Limit to one department ID}
        {--apply : Copy, verify and move legacy training attachments into private storage}';

    protected $description = 'Preview or safely move existing public training attachments to private storage';

    public function handle(): int
    {
        $media = DepartmentContext::withoutScope(fn () => Media::query()
            ->where('model_type', TrainingMaterial::class)->where('collection_name', 'attachments')
            ->whereIn('disk', ['public', 'local'])
            ->when($this->option('department'), fn ($query, $departmentId) => $query->where('department_id', $departmentId))
            ->orderBy('id')->get())->filter(fn (Media $attachment): bool => $attachment->disk === 'public'
                || Storage::disk('public')->allFiles((string) $attachment->id) !== []);
        if (! $this->option('apply')) {
            $this->info('Preview: '.$media->count().' public training attachments. Run with --apply to migrate.');

            return self::SUCCESS;
        }

        $moved = 0;
        $failed = 0;
        foreach ($media as $attachment) {
            try {
                DepartmentContext::run($attachment->department_id, fn () => $this->secure($attachment));
                $moved++;
            } catch (Throwable $exception) {
                $this->error('Attachment '.$attachment->id.': '.$exception->getMessage());
                $failed++;
            }
        }
        $this->info('Moved '.$moved.' attachments; '.$failed.' failed.');

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }

    private function secure(Media $media): void
    {
        $source = Storage::disk('public');
        $destination = Storage::disk('local');
        $path = str_replace('\\', '/', $media->getPathRelativeToRoot());
        $directory = dirname($path);
        // This project uses the library's default media-ID directory. Refuse other layouts.
        if ($directory !== (string) $media->id || ! $this->safePath($path, $directory)) {
            throw new RuntimeException('Unexpected media path; no files were changed.');
        }
        if (! $source->exists($path) && ($media->disk === 'public' || ! $destination->exists($path))) {
            throw new RuntimeException('The original public attachment is missing; metadata was preserved.');
        }
        $paths = $source->allFiles($directory);
        foreach ($paths as $file) {
            if (! $this->safePath($file, $directory)) {
                throw new RuntimeException('Unexpected file path; no files were removed.');
            }
        }
        foreach ($paths as $file) {
            $sourceHash = $this->hash($source, $file);
            if ($destination->exists($file)) {
                if (! hash_equals($sourceHash, $this->hash($destination, $file))) {
                    throw new RuntimeException('A different private file exists; the public file was preserved.');
                }
            } else {
                $stream = $source->readStream($file);
                if (! is_resource($stream)) {
                    throw new RuntimeException('Could not read the public attachment.');
                }
                try {
                    if (! $destination->writeStream($file, $stream)) {
                        throw new RuntimeException('Could not copy the attachment; metadata was preserved.');
                    }
                } finally {
                    fclose($stream);
                }
            }
            if (! hash_equals($sourceHash, $this->hash($destination, $file))) {
                throw new RuntimeException('Copy verification failed; public files and metadata were preserved.');
            }
        }

        DB::transaction(function () use ($media, $source, $destination, $paths): void {
            $current = Media::query()->whereKey($media->id)->lockForUpdate()->firstOrFail();
            if (! in_array($current->disk, ['public', 'local'], true) || $current->file_name !== $media->file_name) {
                throw new RuntimeException('Attachment changed during migration; public files were preserved.');
            }
            foreach ($paths as $file) {
                if (! hash_equals($this->hash($source, $file), $this->hash($destination, $file))) {
                    throw new RuntimeException('Attachment changed during verification; metadata was preserved.');
                }
            }
            $current->forceFill([
                'disk' => 'local',
                'conversions_disk' => $current->conversions_disk === 'public' ? 'local' : $current->conversions_disk,
            ])->save();
        });

        // Public originals are removed only after verified copies and committed metadata.
        foreach ($paths as $file) {
            if (! hash_equals($this->hash($source, $file), $this->hash($destination, $file))
                || ! $source->delete($file)) {
                throw new RuntimeException('Private migration succeeded but public cleanup failed; remove the verified original before launch.');
            }
        }
    }

    private function safePath(string $path, string $directory): bool
    {
        return str_starts_with($path, $directory.'/')
            && ! str_contains($path, '..') && ! str_contains($path, ':') && ! str_contains($path, "\0")
            && ! str_starts_with($path, '/') && ! str_contains($path, '\\');
    }

    private function hash(Filesystem $disk, string $path): string
    {
        $stream = $disk->readStream($path);
        if (! is_resource($stream)) {
            throw new RuntimeException('Could not verify the attachment.');
        }
        try {
            $hash = hash_init('sha256');
            hash_update_stream($hash, $stream);

            return hash_final($hash);
        } finally {
            fclose($stream);
        }
    }
}
