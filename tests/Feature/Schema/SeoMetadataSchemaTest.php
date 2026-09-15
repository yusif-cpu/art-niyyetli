<?php

namespace Tests\Feature\Schema;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\SeoMetadata;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoMetadataSchemaTest extends TestCase
{
    use RefreshDatabase;

    private function makeArtwork(): Artwork
    {
        return Artwork::create([
            'artist_id' => Artist::create([])->id,
            'medium_id' => Medium::create(['slug' => 'oil-on-canvas'])->id,
            'genre_id' => Genre::create(['slug' => 'abstraction'])->id,
            'year_created' => 2023, 'width_cm' => 80, 'height_cm' => 100,
            'price' => 5000, 'inventory_code' => 'AN-2025-014',
        ]);
    }

    public function test_seo_metadata_can_be_attached_to_an_artwork_via_morph_relation(): void
    {
        $artwork = $this->makeArtwork();
        SeoMetadata::create([
            'seoable_type' => Artwork::class, 'seoable_id' => $artwork->id, 'locale' => 'az',
            'title' => null, 'description' => null,
        ]);

        $seo = SeoMetadata::first();

        $this->assertTrue($seo->seoable->is($artwork));
        $this->assertNull($seo->title);
        $this->assertNull($seo->description);
    }

    public function test_duplicate_seoable_locale_pair_is_rejected(): void
    {
        $artwork = $this->makeArtwork();
        SeoMetadata::create(['seoable_type' => Artwork::class, 'seoable_id' => $artwork->id, 'locale' => 'az']);

        $this->expectException(QueryException::class);
        SeoMetadata::create(['seoable_type' => Artwork::class, 'seoable_id' => $artwork->id, 'locale' => 'az']);
    }
}
