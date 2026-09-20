<?php

namespace Tests\Unit\Services;

use App\Enums\Locale;
use App\Exceptions\MediaProcessingFailedException;
use App\Models\Media;
use App\Models\MediaVariant;
use App\Services\Admin\MediaService;
use App\Services\Admin\MediaVariantGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Testing\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Tests\TestCase;

class MediaServiceUploadTest extends TestCase
{
    use RefreshDatabase;

    private function fakeImage(string $name, int $width, int $height): File
    {
        return UploadedFile::fake()->image($name, $width, $height);
    }

    public function test_valid_jpeg_upload_stores_correct_metadata(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $media = app(MediaService::class)->upload($this->fakeImage('artwork.jpg', 800, 600), ['az' => 'Bir rəsm']);

        $this->assertInstanceOf(Media::class, $media);
        $this->assertSame('image/jpeg', $media->mime_type);
        $this->assertSame(800, $media->original_width);
        $this->assertSame(600, $media->original_height);
        $this->assertEqualsWithDelta(1.333333, (float) $media->aspect_ratio, 0.0001);
        $this->assertSame('artwork.jpg', $media->original_filename);
        $this->assertSame('Bir rəsm', $media->translations->firstWhere('locale', Locale::Az)->alt_text);
        $this->assertSame(8, $media->variants->count());

        Storage::disk('local')->assertExists($media->path);
        $this->assertMatchesRegularExpression('#^media/[0-9a-f-]{36}/original\.jpg$#', $media->path);
    }

    public function test_client_filename_never_controls_the_storage_path(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $media = app(MediaService::class)->upload($this->fakeImage('../../evil.jpg', 50, 50), []);

        $this->assertStringNotContainsString('evil', $media->path);
        $this->assertStringNotContainsString('..', $media->path);
    }

    public function test_corrupt_file_is_rejected_and_nothing_is_persisted(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $corrupt = UploadedFile::fake()->create('broken.jpg', 5, 'image/jpeg');

        $this->expectException(ValidationException::class);

        try {
            app(MediaService::class)->upload($corrupt, []);
        } finally {
            $this->assertDatabaseCount('media', 0);
        }
    }

    public function test_disallowed_format_is_rejected(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $gif = UploadedFile::fake()->image('animation.gif', 50, 50);

        $this->expectException(ValidationException::class);

        app(MediaService::class)->upload($gif, []);
    }

    public function test_valid_png_and_webp_uploads_store_correct_mime(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $png = app(MediaService::class)->upload($this->fakeImage('artwork.png', 400, 300), []);
        $this->assertSame('image/png', $png->mime_type);

        $webp = app(MediaService::class)->upload($this->fakeImage('artwork.webp', 400, 300), []);
        $this->assertSame('image/webp', $webp->mime_type);
    }

    // -- file name length -------------------------------------------------------------------------------------------

    public function test_a_file_name_longer_than_the_column_is_truncated_not_rejected(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $media = app(MediaService::class)->upload($this->fakeImage(str_repeat('a', 300).'.jpg', 50, 50), []);

        $this->assertSame(255, mb_strlen($media->original_filename));
        $this->assertStringStartsWith('aaaa', $media->original_filename);
    }

    public function test_truncation_counts_characters_not_bytes(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $media = app(MediaService::class)->upload($this->fakeImage(str_repeat('ə', 300).'.jpg', 50, 50), []);

        $this->assertSame(255, mb_strlen($media->original_filename));
        $this->assertSame(str_repeat('ə', 255), $media->original_filename);
    }

    public function test_a_normal_file_name_is_stored_unchanged(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $media = app(MediaService::class)->upload($this->fakeImage('Şəki-mənzərəsi 2026.jpg', 50, 50), []);

        $this->assertSame('Şəki-mənzərəsi 2026.jpg', $media->original_filename);
    }

    // -- public variant addresses ----------------------------------------------------------------------------------

    public function test_the_public_variants_are_stored_under_the_random_token_and_exist_on_disk(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $media = app(MediaService::class)->upload($this->fakeImage('artwork.jpg', 400, 300), []);

        foreach ($media->variants as $variant) {
            $this->assertMatchesRegularExpression('#^media/'.$media->id.'/[0-9a-f]{32}/(thumbnail|catalogue|detail|full)-(webp|jpeg)\.(webp|jpg)$#', $variant->path);
            Storage::disk('public')->assertExists($variant->path);
        }
    }

    // -- a failed upload leaves no files behind ------------------------------------------------------------------

    private function recordingGenerator(): MediaVariantGenerator
    {
        $generator = new class extends MediaVariantGenerator
        {
            /** @var array<int, string> */
            public array $created = [];

            public function generate(Media $media, string $sourceBinary): array
            {
                return $this->created = parent::generate($media, $sourceBinary);
            }
        };

        $this->app->instance(MediaVariantGenerator::class, $generator);

        return $generator;
    }

    public function test_a_failure_while_generating_variants_leaves_no_files_or_rows(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $saves = 0;
        MediaVariant::saving(function () use (&$saves) {
            if (++$saves === 6) {
                throw new RuntimeException('disk full');
            }
        });

        try {
            app(MediaService::class)->upload($this->fakeImage('artwork.jpg', 400, 300), []);
            $this->fail('the upload should have failed');
        } catch (MediaProcessingFailedException $e) {
            $this->assertSame('Image processing failed. Please try again.', $e->getMessage());
        }

        $this->assertSame([], Storage::disk('public')->allFiles(), 'public variants removed');
        $this->assertSame([], Storage::disk('local')->allFiles(), 'private original removed');
        $this->assertDatabaseCount('media', 0);
        $this->assertDatabaseCount('media_variants', 0);
    }

    public function test_a_failure_after_all_variants_were_written_still_removes_them(): void
    {
        // The case the original code missed: the transaction fails AFTER the public files exist.
        Storage::fake('local');
        Storage::fake('public');
        $generator = $this->recordingGenerator();
        Media::retrieved(function () {
            throw new RuntimeException('connection lost');
        });

        try {
            app(MediaService::class)->upload($this->fakeImage('artwork.jpg', 400, 300), []);
            $this->fail('the upload should have failed');
        } catch (MediaProcessingFailedException) {
            // expected
        }

        $this->assertCount(8, $generator->created, 'all eight public files really had been written before the failure');
        $this->assertSame([], Storage::disk('public')->allFiles(), 'and every one of them was removed');
        $this->assertSame([], Storage::disk('local')->allFiles());
        $this->assertDatabaseCount('media', 0);
        $this->assertDatabaseCount('media_variants', 0);
    }

    public function test_a_successful_upload_keeps_all_of_its_files(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        app(MediaService::class)->upload($this->fakeImage('artwork.jpg', 400, 300), []);

        $this->assertCount(8, Storage::disk('public')->allFiles());
        $this->assertCount(1, Storage::disk('local')->allFiles());
    }
}
