<?php

namespace Tests\Feature\Api;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\ArtworkImage;
use App\Models\Genre;
use App\Models\Media;
use App\Models\MediaVariant;
use App\Models\Medium;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtworkDetailApiTest extends TestCase
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
            'short_description' => 'Short desc',
            'provenance' => 'Provenance info',
        ]);

        return $artwork;
    }

    public function test_returns_404_for_unknown_inventory_code(): void
    {
        $this->getJson('/api/v1/artworks/DOES-NOT-EXIST')->assertStatus(404);
    }

    public function test_returns_404_for_inactive_artwork(): void
    {
        $artwork = $this->makeArtwork(['is_active' => false]);

        $this->getJson("/api/v1/artworks/{$artwork->inventory_code}")->assertStatus(404);
    }

    public function test_detail_includes_extended_fields(): void
    {
        $artwork = $this->makeArtwork(['certificate' => true, 'frame_condition' => 'Good', 'delivery_note' => 'Ships in 5 days']);

        $response = $this->getJson("/api/v1/artworks/{$artwork->inventory_code}");

        $response->assertOk();
        $response->assertJsonPath('data.short_description', 'Short desc');
        $response->assertJsonPath('data.provenance', 'Provenance info');
        $response->assertJsonPath('data.certificate', true);
        $response->assertJsonPath('data.frame_condition', 'Good');
        $response->assertJsonPath('data.delivery_note', 'Ships in 5 days');
        $response->assertJsonPath('data.year_created', $artwork->year_created);
    }

    public function test_images_ordered_and_use_full_variant_distinct_from_catalogue(): void
    {
        $artwork = $this->makeArtwork();

        $media = Media::factory()->create();
        foreach (['catalogue', 'full'] as $size) {
            MediaVariant::create([
                'media_id' => $media->id,
                'variant' => "{$size}-webp",
                'disk' => 'public',
                'path' => "variants/{$size}.webp",
                'mime_type' => 'image/webp',
                'size_bytes' => 100,
                'width' => 100,
                'height' => 100,
            ]);
        }

        ArtworkImage::create([
            'artwork_id' => $artwork->id, 'media_id' => $media->id, 'type' => 'main', 'sort_order' => 0, 'is_main' => true,
        ]);

        $response = $this->getJson("/api/v1/artworks/{$artwork->inventory_code}");

        $response->assertOk();
        $detailUrl = $response->json('data.images.0.url');
        $cardUrl = $response->json('data.image_url');

        $this->assertStringContainsString('full.webp', $detailUrl);
        $this->assertStringContainsString('catalogue.webp', $cardUrl);
        $this->assertNotSame($detailUrl, $cardUrl);
    }

    public function test_similar_returns_same_genre_excluding_self_capped_at_4(): void
    {
        $genre = Genre::factory()->create(['slug' => 'shared-genre']);
        $artwork = $this->makeArtwork(['genre_id' => $genre->id]);

        for ($i = 0; $i < 5; $i++) {
            $this->makeArtwork(['genre_id' => $genre->id]);
        }
        $this->makeArtwork(); // different genre, must not appear

        $response = $this->getJson("/api/v1/artworks/{$artwork->inventory_code}");

        $response->assertOk();
        $similar = $response->json('data.similar');
        $this->assertCount(4, $similar);
        $this->assertNotContains($artwork->inventory_code, collect($similar)->pluck('inventory_code')->all());
    }

    public function test_similar_empty_when_no_other_artworks_in_genre(): void
    {
        $artwork = $this->makeArtwork();

        $response = $this->getJson("/api/v1/artworks/{$artwork->inventory_code}");

        $response->assertOk();
        $this->assertSame([], $response->json('data.similar'));
    }

    public function test_response_never_leaks_raw_storage_paths_or_disk(): void
    {
        $artwork = $this->makeArtwork();

        $response = $this->getJson("/api/v1/artworks/{$artwork->inventory_code}");

        $response->assertOk();
        $body = $response->getContent();
        $this->assertStringNotContainsString('storage/app/private', $body);
        $this->assertStringNotContainsString('"disk"', $body);
        $this->assertStringNotContainsString('"path"', $body);
    }
}
