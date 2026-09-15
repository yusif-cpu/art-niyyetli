<?php

namespace Tests\Feature\Schema;

use App\Models\Media;
use App\Models\MediaTranslation;
use App\Models\MediaVariant;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MediaSchemaTest extends TestCase
{
    use RefreshDatabase;

    private function makeMedia(): Media
    {
        return Media::create([
            'type' => 'image',
            'disk' => 'public',
            'path' => 'x.jpg',
            'original_filename' => 'x.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 1000,
            'original_width' => 800,
            'original_height' => 600,
            'aspect_ratio' => 1.333333,
        ]);
    }

    public function test_media_has_translations_and_variants(): void
    {
        $media = $this->makeMedia();

        MediaTranslation::create(['media_id' => $media->id, 'locale' => 'az', 'alt_text' => 'test']);
        MediaVariant::create([
            'media_id' => $media->id, 'variant' => 'thumbnail', 'disk' => 'public',
            'path' => 'x-thumb.jpg', 'mime_type' => 'image/jpeg', 'size_bytes' => 100,
            'width' => 200, 'height' => 150,
        ]);

        $this->assertCount(1, $media->translations);
        $this->assertCount(1, $media->variants);
    }

    public function test_translation_uniqueness_is_enforced_per_media_and_locale(): void
    {
        $media = $this->makeMedia();
        MediaTranslation::create(['media_id' => $media->id, 'locale' => 'az', 'alt_text' => 'a']);

        $this->expectException(QueryException::class);
        MediaTranslation::create(['media_id' => $media->id, 'locale' => 'az', 'alt_text' => 'b']);
    }

    public function test_media_soft_deletes(): void
    {
        $media = $this->makeMedia();
        $media->delete();

        $this->assertSame(0, Media::count());
        $this->assertSame(1, Media::withTrashed()->count());
    }
}
