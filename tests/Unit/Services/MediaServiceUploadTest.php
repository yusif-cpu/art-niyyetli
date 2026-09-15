<?php

namespace Tests\Unit\Services;

use App\Enums\Locale;
use App\Models\Media;
use App\Services\Admin\MediaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Testing\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
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
}
