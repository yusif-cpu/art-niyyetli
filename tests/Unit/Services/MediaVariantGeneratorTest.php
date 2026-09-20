<?php

namespace Tests\Unit\Services;

use App\Exceptions\MediaProcessingFailedException;
use App\Models\Media;
use App\Models\MediaVariant;
use App\Services\Admin\MediaVariantGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
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

    // -- unguessable public addresses -----------------------------------------------------------------------------

    public function test_variant_files_live_under_a_random_per_media_token(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create();
        $other = Media::factory()->create();
        $generator = new MediaVariantGenerator;

        $created = $generator->generate($media, $this->jpegBinary(300, 200));
        $generator->generate($other, $this->jpegBinary(300, 200));

        $paths = $media->variants()->pluck('path')->all();
        $this->assertCount(8, $paths);
        $this->assertEqualsCanonicalizing($paths, $created, 'generate() reports exactly the files it created');

        $tokens = [];
        foreach ($paths as $path) {
            $this->assertSame(1, preg_match('#^media/'.$media->id.'/([0-9a-f]{32})/(thumbnail|catalogue|detail|full)-(webp|jpeg)\.(webp|jpg)$#', $path, $matches), $path);
            $tokens[] = $matches[1];
            Storage::disk('public')->assertExists($path);
        }

        $this->assertCount(1, array_unique($tokens), 'one token per media, shared by all of its variants');
        $otherToken = explode('/', $other->variants()->value('path'))[2];
        $this->assertNotSame($tokens[0], $otherToken, 'a different media gets a different token');
    }

    public function test_the_address_cannot_be_worked_out_from_the_media_id_alone(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create();

        (new MediaVariantGenerator)->generate($media, $this->jpegBinary(300, 200));

        // The pre-token scheme: predictable from the id, so anyone could enumerate every image.
        Storage::disk('public')->assertMissing("media/{$media->id}/thumbnail-webp.webp");
        Storage::disk('public')->assertMissing("media/{$media->id}/full-jpeg.jpg");
    }

    public function test_regenerating_reuses_the_token_and_overwrites_the_same_files(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create();
        $generator = new MediaVariantGenerator;

        $generator->generate($media, $this->jpegBinary(300, 200));
        $before = $media->variants()->pluck('path')->sort()->values()->all();

        $second = $generator->generate($media, $this->jpegBinary(300, 200));

        $this->assertSame($before, $media->variants()->pluck('path')->sort()->values()->all());
        $this->assertSame([], $second, 'no new files: everything was overwritten in place');
        $this->assertCount(8, Storage::disk('public')->allFiles());
    }

    public function test_a_media_that_only_has_old_style_variants_gets_a_fresh_token_for_new_files(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create();
        $media->variants()->create([
            'variant' => 'thumbnail-webp', 'disk' => 'public', 'path' => "media/{$media->id}/thumbnail-webp.webp",
            'mime_type' => 'image/webp', 'size_bytes' => 1, 'width' => 1, 'height' => 1,
        ]);

        (new MediaVariantGenerator)->generate($media, $this->jpegBinary(300, 200));

        $this->assertSame(1, preg_match('#^media/'.$media->id.'/[0-9a-f]{32}/thumbnail-webp\.webp$#', $media->variants()->where('variant', 'thumbnail-webp')->value('path')));
    }

    // -- a failure part-way leaves nothing behind -----------------------------------------------------------------

    public function test_a_failure_part_way_removes_the_files_that_call_had_already_written(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create();
        $saves = 0;
        MediaVariant::saving(function () use (&$saves) {
            if (++$saves === 5) {
                throw new RuntimeException('disk full');
            }
        });

        try {
            (new MediaVariantGenerator)->generate($media, $this->jpegBinary(300, 200));
            $this->fail('the simulated failure should have propagated');
        } catch (RuntimeException $e) {
            $this->assertSame('disk full', $e->getMessage());
        }

        $this->assertSame([], Storage::disk('public')->allFiles(), 'the four files written before the failure were removed');
    }

    public function test_a_failed_regeneration_never_removes_files_that_already_existed(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create();
        $generator = new MediaVariantGenerator;
        $generator->generate($media, $this->jpegBinary(300, 200));

        $saves = 0;
        MediaVariant::saving(function () use (&$saves) {
            if (++$saves === 3) {
                throw new RuntimeException('disk full');
            }
        });

        try {
            $generator->generate($media, $this->jpegBinary(300, 200));
        } catch (RuntimeException) {
            // expected
        }

        $this->assertCount(8, Storage::disk('public')->allFiles(), 'the existing variants, still referenced by the database, are untouched');
    }

    public function test_deleting_reported_files_removes_them_and_ignores_missing_ones(): void
    {
        Storage::fake('public');

        $media = Media::factory()->create();
        $generator = new MediaVariantGenerator;
        $created = $generator->generate($media, $this->jpegBinary(300, 200));

        $generator->deleteFiles([...$created, 'media/999/none/missing.webp']);

        $this->assertSame([], Storage::disk('public')->allFiles());
        $generator->deleteFiles([]); // nothing to do, must not fail
    }
}
