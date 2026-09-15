<?php

namespace Tests\Feature\Schema;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\ArtworkImage;
use App\Models\Genre;
use App\Models\Media;
use App\Models\Medium;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtworkSchemaTest extends TestCase
{
    use RefreshDatabase;

    private function baseAttributes(): array
    {
        return [
            'artist_id' => Artist::create([])->id,
            'medium_id' => Medium::create(['slug' => 'oil-on-canvas'])->id,
            'genre_id' => Genre::create(['slug' => 'abstraction'])->id,
            'year_created' => 2023,
            'width_cm' => 80,
            'height_cm' => 100,
            'price' => 12500.50,
            'inventory_code' => 'AN-2025-014',
        ];
    }

    public function test_width_and_height_are_mandatory(): void
    {
        $this->expectException(QueryException::class);
        Artwork::create(array_merge($this->baseAttributes(), ['width_cm' => null, 'inventory_code' => 'AN-2025-015']));
    }

    public function test_inventory_code_is_globally_unique(): void
    {
        Artwork::create($this->baseAttributes());

        $this->expectException(QueryException::class);
        Artwork::create($this->baseAttributes());
    }

    public function test_price_accepts_fixed_point_decimal_and_round_trips_exactly(): void
    {
        $artwork = Artwork::create($this->baseAttributes());

        $this->assertSame('12500.50', (string) $artwork->fresh()->price);
    }

    public function test_aspect_ratio_is_computed_and_stored_on_save(): void
    {
        $artwork = Artwork::create($this->baseAttributes());

        $this->assertEquals(0.8, (float) $artwork->fresh()->aspect_ratio);
    }

    public function test_artwork_soft_deletes(): void
    {
        $artwork = Artwork::create($this->baseAttributes());
        $artwork->delete();

        $this->assertSame(0, Artwork::count());
        $this->assertSame(1, Artwork::withTrashed()->count());
    }

    public function test_artwork_image_links_to_media(): void
    {
        $artwork = Artwork::create($this->baseAttributes());
        $media = Media::create([
            'type' => 'image', 'disk' => 'public', 'path' => 'x.jpg',
            'original_filename' => 'x.jpg', 'mime_type' => 'image/jpeg',
            'size_bytes' => 1000, 'original_width' => 800, 'original_height' => 600,
            'aspect_ratio' => 1.333333,
        ]);

        ArtworkImage::create([
            'artwork_id' => $artwork->id, 'media_id' => $media->id,
            'type' => 'main', 'is_main' => true,
        ]);

        $this->assertCount(1, $artwork->fresh()->images);
    }
}
