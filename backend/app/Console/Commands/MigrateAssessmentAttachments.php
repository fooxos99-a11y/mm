<?php

namespace App\Console\Commands;

use App\Services\AssessmentAttachmentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class MigrateAssessmentAttachments extends Command
{
    protected $signature = 'assessment-attachments:migrate {--dry-run : Count legacy attachments without writing files}';

    protected $description = 'Move legacy assessment Base64 attachments from database columns to private storage';

    public function handle(AssessmentAttachmentService $attachments): int
    {
        $mappings = [
            ['course_questions', 'attachment_data_url', 'attachment_path', 'attachment_name', 'attachment_type'],
            ['final_exam_questions', 'attachment_data_url', 'attachment_path', 'attachment_name', 'attachment_type'],
            ['course_submission_answers', 'file_data_url', 'file_path', 'file_name', 'file_type'],
            ['final_exam_submission_answers', 'file_data_url', 'file_path', 'file_name', 'file_type'],
        ];
        $migrated = 0;
        $skipped = 0;

        foreach ($mappings as [$table, $dataColumn, $pathColumn, $nameColumn, $typeColumn]) {
            DB::table($table)
                ->whereNull($pathColumn)
                ->where($dataColumn, 'like', 'data:%;base64,%')
                ->orderBy('id')
                ->lazyById(50)
                ->each(function (object $row) use (
                    $attachments,
                    $table,
                    $dataColumn,
                    $pathColumn,
                    $nameColumn,
                    $typeColumn,
                    &$migrated,
                    &$skipped,
                ): void {
                    if ($this->option('dry-run')) {
                        $migrated++;

                        return;
                    }

                    try {
                        $stored = $attachments->storeAnswer([
                            'fileName' => $row->{$nameColumn} ?? null,
                            'fileType' => $row->{$typeColumn} ?? null,
                            'fileDataUrl' => $row->{$dataColumn} ?? null,
                        ]);

                        DB::table($table)->where('id', $row->id)->update([
                            $pathColumn => $stored['file_path'],
                            $dataColumn => null,
                        ]);
                        $migrated++;
                    } catch (Throwable $exception) {
                        report($exception);
                        $skipped++;
                    }
                });
        }

        $this->info(sprintf(
            '%s legacy assessment attachments; %d skipped.',
            $this->option('dry-run') ? "Found {$migrated}" : "Migrated {$migrated}",
            $skipped,
        ));

        return $skipped === 0 ? self::SUCCESS : self::FAILURE;
    }
}
