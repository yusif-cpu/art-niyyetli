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

    public function test_price_max_alone_is_accepted_and_filters(): void
    {
        $cheap = $this->makeArtwork(['price' => 500]);
        $this->makeArtwork(['price' => 9000]);

        $response = $this->getJson('/api/v1/artworks?price_max=1000');

        $response->assertOk();
        $this->assertSame([$cheap->inventory_code], collect($response->json('data'))->pluck('inventory_code')->all());
    }

    public function test_price_min_alone_and_both_together_filter(): void
    {
        $this->makeArtwork(['price' => 500]);
        $mid = $this->makeArtwork(['price' => 2000]);
        $high = $this->makeArtwork(['price' => 9000]);

        $min = $this->getJson('/api/v1/artworks?price_min=1000&sort=price_asc');
        $min->assertOk();
        $this->assertSame([$mid->inventory_code, $high->inventory_code], collect($min->json('data'))->pluck('inventory_code')->all());

        $both = $this->getJson('/api/v1/artworks?price_min=1000&price_max=5000');
        $both->assertOk();
        $this->assertSame([$mid->inventory_code], collect($both->json('data'))->pluck('inventory_code')->all());
    }

    public function test_price_max_alone_still_rejects_invalid_values(): void
    {
        $this->getJson('/api/v1/artworks?price_max=abc')->assertStatus(422)->assertJsonValidationErrors('price_max');
        $this->getJson('/api/v1/artworks?price_max=-1')->assertStatus(422)->assertJsonValidationErrors('price_max');
    }

    public function test_size_filter_uses_the_larger_dimension(): void
    {
        $small = $this->makeArtwork(['width_cm' => 30, 'height_cm' => 40]);
        $tall = $this->makeArtwork(['width_cm' => 20, 'height_cm' => 120]);
        $wide = $this->makeArtwork(['width_cm' => 150, 'height_cm' => 50]);

        $codes = fn (string $qs) => collect($this->getJson("/api/v1/artworks?{$qs}&sort=newest")->assertOk()->json('data'))
            ->pluck('inventory_code')->sort()->values()->all();

        $this->assertSame(collect([$tall, $wide])->pluck('inventory_code')->sort()->values()->all(), $codes('size_min=100'));
        $this->assertSame([$small->inventory_code], $codes('size_max=50'));
        $this->assertSame([$tall->inventory_code], $codes('size_min=100&size_max=120'));
    }

    public function test_size_bounds_are_inclusive(): void
    {
        $exact = $this->makeArtwork(['width_cm' => 60, 'height_cm' => 100]);

        $this->assertCount(1, $this->getJson('/api/v1/artworks?size_min=100')->json('data'));
        $this->assertCount(1, $this->getJson('/api/v1/artworks?size_max=100')->json('data'));
        $this->assertSame($exact->inventory_code, $this->getJson('/api/v1/artworks?size_min=100&size_max=100')->json('data.0.inventory_code'));
    }

    public function test_size_max_below_size_min_returns_422_but_size_max_alone_is_fine(): void
    {
        $this->getJson('/api/v1/artworks?size_min=100&size_max=50')->assertStatus(422)->assertJsonValidationErrors('size_max');
        $this->getJson('/api/v1/artworks?size_max=50')->assertOk();
    }

    public function test_invalid_size_values_return_422(): void
    {
        $this->getJson('/api/v1/artworks?size_min=abc')->assertStatus(422)->assertJsonValidationErrors('size_min');
        $this->getJson('/api/v1/artworks?size_min=-5')->assertStatus(422)->assertJsonValidationErrors('size_min');
        $this->getJson('/api/v1/artworks?size_max=abc')->assertStatus(422)->assertJsonValidationErrors('size_max');
    }
}
