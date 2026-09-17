<?php

namespace Tests\Feature\Seo;

use App\Enums\Locale;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\SeoMetadata;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoOverrideTest extends TestCase
{
    use RefreshDatabase;

    private function makeArtwork(string $inventoryCode): Artwork
    {
        return Artwork::create([
            'artist_id' => Artist::create([])->id,
            'medium_id' => Medium::create(['slug' => 'oil-on-canvas'])->id,
            'genre_id' => Genre::create(['slug' => 'abstraction'])->id,
            'year_created' => 2023, 'width_cm' => 80, 'height_cm' => 100,
            'price' => 5000, 'inventory_code' => $inventoryCode,
        ]);
    }

    public function test_seo_override_returns_the_row_matching_the_requested_locale(): void
    {
        $artwork = $this->makeArtwork('AN-SEO-1');

        SeoMetadata::create([
            'seoable_type' => Artwork::class, 'seoable_id' => $artwork->id,
            'locale' => 'en', 'title' => 'Custom EN Title', 'description' => 'Custom EN description.',
        ]);

        $override = $artwork->seoOverride(Locale::En);

        $this->assertNotNull($override);
        $this->assertSame('Custom EN Title', $override->title);
    }

    public function test_seo_override_returns_null_when_no_row_exists_for_that_locale(): void
    {
        $artwork = $this->makeArtwork('AN-SEO-2');

        SeoMetadata::create([
            'seoable_type' => Artwork::class, 'seoable_id' => $artwork->id,
            'locale' => 'en', 'title' => 'EN only',
        ]);

        $this->assertNull($artwork->seoOverride(Locale::Az));
    }

    public function test_seo_override_works_when_the_relation_is_already_eager_loaded(): void
    {
        $artwork = $this->makeArtwork('AN-SEO-3');
        SeoMetadata::create(['seoable_type' => Artwork::class, 'seoable_id' => $artwork->id, 'locale' => 'az', 'title' => 'AZ Title']);

        $loaded = Artwork::query()->with('seoMetadata')->find($artwork->id);

        $this->assertTrue($loaded->relationLoaded('seoMetadata'));
        $this->assertSame('AZ Title', $loaded->seoOverride(Locale::Az)->title);
    }
}
