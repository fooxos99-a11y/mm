<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class PrivateStorageBackupPermissionsTest extends TestCase
{
    public function test_private_uploads_allow_group_backups_without_world_read_access(): void
    {
        if (PHP_OS_FAMILY === 'Windows') {
            $this->markTestSkipped('POSIX permissions are verified on the Linux release runner.');
        }

        $disk = Storage::disk('local');
        $directory = 'backup-permissions-'.Str::uuid();
        $file = $directory.'/nested/private.txt';

        try {
            $this->assertTrue($disk->put($file, 'Private upload for backup verification'));
            clearstatcache();
            $this->assertSame('private', $disk->getVisibility($file));
            $this->assertSame(0640, fileperms($disk->path($file)) & 0777);
            $this->assertSame(02750, fileperms($disk->path($directory)) & 07777);
            $this->assertSame(02750, fileperms($disk->path($directory.'/nested')) & 07777);
            $this->assertSame(filegroup($disk->path($directory)), filegroup($disk->path($file)));
            $this->assertSame('Private upload for backup verification', $disk->get($file));
            $this->assertStringStartsWith(storage_path('app/private'), $disk->path($file));
        } finally {
            $disk->deleteDirectory($directory);
        }
    }
}
