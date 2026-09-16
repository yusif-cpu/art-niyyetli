<?php

namespace Tests\Feature\Api;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtworkCatalogueApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeArtwork(array $overrides = []): Artwork
    {
        $artist = $overrides['artist_id'] ?? Artist::factory()->create()->id;
        $genre = $overrides['genre_id'] ?? Genre::factory()->create(['slug' => 'genre-'.uniqid()])->id;
        $medium = $overrides['medium_id'] ?? Medium::factory()->create(['slug' => 'medium-'.uniqid()])->id;

        $artwork = Artwork::factory()->create(array_merge([
            'artist_id' => $artist,
            'genre_id' => $genre,
            'medium_id' => $medium,
            'is_active' => true,
        ], $overrides));

        $artwork->translations()->create([
            'locale' => 'az',
            'slug' => 'artwork-'.$artwork->id,
            'title' => 'Title '.$artwork->id,
            'short_description' => 'Short',
            'provenance' => 'Provenance',
        ]);

        return $artwork;
    }

    public function test_excludes_inactive_and_soft_deleted(): void
    {
        $this->makeArtwork(['is_active' => true]);
        $inactive = $this->makeArtwork(['is_active' => false]);
        $deleted = $this->makeArtwork(['is_active' => true]);
        $deleted->delete();

        $response = $this->getJson('/api/v1/artworks');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_sold_artwork_remains_visible(): void
    {
        $this->makeArtwork(['availability' => 'sold']);

        $response = $this->getJson('/api/v1/artworks');

        $response->assertOk();
        $this->assertSame('sold', $response->json('data.0.availability'));
    }

    public function test_filters_apply_and_logic_combined(): void
    {
        $artist = Artist::factory()->create();
        $genre = Genre::factory()->create(['slug' => 'painting']);
        $medium = Medium::factory()->create(['slug' => 'oil']);

        $match = $this->makeArtwork([
            'artist_id' => $artist->id, 'genre_id' => $genre->id, 'medium_id' => $medium->id,
            'availability' => 'available', 'price' => 2000,
        ]);
        $this->makeArtwork(['artist_id' => $artist->id, 'genre_id' => $genre->id, 'availability' => 'sold', 'price' => 2000]);
        $this->makeArtwork(['genre_id' => $genre->id, 'medium_id' => $medium->id, 'availability' => 'available', 'price' => 2000]);

        $response = $this->getJson("/api/v1/artworks?artist={$artist->id}&medium=oil&status=available&price_min=1000&price_max=5000");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($match->inventory_code, $data[0]['inventory_code']);
    }

    public function test_price_max_less_than_price_min_returns_422(): void
    {
        $this->getJson('/api/v1/artworks?price_min=5000&price_max=1000')->assertStatus(422);
    }

    public function test_invalid_status_returns_422(): void
    {
        $this->getJson('/api/v1/artworks?status=not-a-status')->assertStatus(422);
    }

    public function test_sort_price_asc_and_desc(): void
    {
        $this->makeArtwork(['price' => 3000]);
        $this->makeArtwork(['price' => 1000]);
        $this->makeArtwork(['price' => 2000]);

        $asc = $this->getJson('/api/v1/artworks?sort=price_asc')->json('data');
        $this->assertEquals([1000, 2000, 3000], collect($asc)->pluck('price')->all());

        $desc = $this->getJson('/api/v1/artworks?sort=price_desc')->json('data');
        $this->assertEquals([3000, 2000, 1000], collect($desc)->pluck('price')->all());
    }

    public function test_per_page_bounded_and_normalized(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->makeArtwork();
        }

        $huge = $this->getJson('/api/v1/artworks?per_page=999');
        $huge->assertOk();
        $this->assertLessThanOrEqual(60, count($huge->json('data')));

        $zero = $this->getJson('/api/v1/artworks?per_page=0');
        $zero->assertOk();
        $this->assertSame(24, $zero->json('meta.per_page'));
    }

    public function test_response_envelope_has_data_meta_links(): void
    {
        $this->makeArtwork();

        $response = $this->getJson('/api/v1/artworks');

        $response->assertOk();
        $response->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page', 'per_page', 'total'], 'links']);
    }

    public function test_hidden_price_returns_null_price_and_currency(): void
    {
        $this->makeArtwork(['show_price' => false, 'price' => 4000]);

        $response = $this->getJson('/api/v1/artworks');

        $response->assertOk();
        $this->assertNull($response->json('data.0.price'));
        $this->assertNull($response->json('data.0.currency'));
        $this->assertNotNull($response->json('data.0.availability'));
    }
}
