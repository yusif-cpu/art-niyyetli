<?php

namespace Tests\Unit\Services;

use App\Exceptions\MediaProcessingFailedException;
use App\Models\Media;
use App\Services\Admin\MediaVariantGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaVariantGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private function jpegBinary(int $width, int $height): string
    {
        $image = imagecreatetruecolor($width, $height);
        imagefill($image, 0, 0, imagecolorallocate($image, 200, 50, 50));

        ob_start();
        imagejpeg($image);
        $binary = ob_get_clean();
        imagedestroy($image);

        return $binary;
    }

    public function test_generates_all_size_and_format_combinations(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create(['original_width' => 3000, 'original_height' => 2000, 'aspect_ratio' => 1.5]);

        (new MediaVariantGenerator)->generate($media, $this->jpegBinary(3000, 2000));

        $this->assertSame(8, $media->variants()->count());

        foreach (['thumbnail', 'catalogue', 'detail', 'full'] as $size) {
            foreach (['webp', 'jpeg'] as $format) {
                $variant = $media->variants()->where('variant', "{$size}-{$format}")->first();
                $this->assertNotNull($variant, "Missing variant {$size}-{$format}");
                Storage::disk('public')->assertExists($variant->path);
                $this->assertEqualsWithDelta(1.5, $variant->width / $variant->height, 0.02);
            }
        }
    }

    public function test_never_upscales_small_originals(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create(['original_width' => 100, 'original_height' => 100, 'aspect_ratio' => 1.0]);

        (new MediaVariantGenerator)->generate($media, $this->jpegBinary(100, 100));

        $full = $media->variants()->where('variant', 'full-jpeg')->first();
        $this->assertSame(100, $full->width);
        $this->assertSame(100, $full->height);
    }

    public function test_regenerating_is_idempotent_and_creates_no_duplicates(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create(['original_width' => 400, 'original_height' => 400, 'aspect_ratio' => 1.0]);
        $binary = $this->jpegBinary(400, 400);

        $generator = new MediaVariantGenerator;
        $generator->generate($media, $binary);
        $generator->generate($media, $binary);

        $this->assertSame(8, $media->variants()->count());
    }

    public function test_undecodable_source_fails_safely_without_a_fatal_error(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create();

        $this->expectException(MediaProcessingFailedException::class);

        (new MediaVariantGenerator)->generate($media, 'not actually an image');
    }
}
