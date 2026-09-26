<?php

namespace Tests\Feature\Infrastructure;

use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * The local Docker setup must not depend on a developer creating an absolute host-path symlink by hand: the
 * php-fpm container's entrypoint (re)creates public/storage as a relative link, which resolves the same in every
 * container that bind-mounts the project. Runs the real script against a scratch directory.
 */
class DockerStorageLinkTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();

        $this->root = sys_get_temp_dir().'/storage-link-'.uniqid();
        mkdir($this->root.'/public', 0777, true);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->root);

        parent::tearDown();
    }

    private function runEntrypoint(): Process
    {
        $process = new Process(['sh', base_path('docker/php/docker-entrypoint.sh'), 'echo', 'started'], null, ['APP_ROOT' => $this->root]);
        $process->run();

        return $process;
    }

    public function test_it_creates_a_relative_link_that_resolves_to_the_public_disk_and_starts_the_command(): void
    {
        $process = $this->runEntrypoint();

        $this->assertTrue($process->isSuccessful(), $process->getErrorOutput());
        $this->assertStringContainsString('started', $process->getOutput());
        $this->assertSame('../storage/app/public', readlink($this->root.'/public/storage'));
        $this->assertSame(realpath($this->root.'/storage/app/public'), realpath($this->root.'/public/storage'));
    }

    public function test_it_replaces_a_stale_absolute_link_and_is_idempotent(): void
    {
        symlink('/home/somebody/projects/art-niyyetli/storage/app/public', $this->root.'/public/storage');

        $this->assertTrue($this->runEntrypoint()->isSuccessful());
        $this->assertSame('../storage/app/public', readlink($this->root.'/public/storage'));

        $this->assertTrue($this->runEntrypoint()->isSuccessful());
        $this->assertSame('../storage/app/public', readlink($this->root.'/public/storage'));
    }

    public function test_it_never_replaces_a_real_directory(): void
    {
        mkdir($this->root.'/public/storage');
        file_put_contents($this->root.'/public/storage/keep.txt', 'x');

        $this->assertTrue($this->runEntrypoint()->isSuccessful());
        $this->assertFalse(is_link($this->root.'/public/storage'));
        $this->assertFileExists($this->root.'/public/storage/keep.txt');
    }

    public function test_the_php_image_runs_the_entrypoint(): void
    {
        $dockerfile = (string) file_get_contents(base_path('docker/php/Dockerfile'));

        $this->assertStringContainsString('docker/php/docker-entrypoint.sh', $dockerfile);
        $this->assertMatchesRegularExpression('/^ENTRYPOINT \["docker-entrypoint\.sh"\]$/m', $dockerfile);
        $this->assertMatchesRegularExpression('/^CMD \["php-fpm"\]$/m', $dockerfile);
    }
}
