<?php

namespace Tests\Feature\Api;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtistApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeArtist(array $overrides = []): Artist
    {
        $artist = Artist::factory()->create(array_merge(['is_active' => true], $overrides));
        $artist->translations()->create([
            'locale' => 'az',
            'slug' => 'artist-'.$artist->id,
            'first_name' => 'Adı'.$artist->id,
            'last_name' => 'Soyadı',
        ]);

        return $artist;
    }

    public function test_index_excludes_inactive_and_soft_deleted(): void
    {
        $this->makeArtist(['is_active' => true]);
        $this->makeArtist(['is_active' => false]);
        $deleted = $this->makeArtist(['is_active' => true]);
        $deleted->delete();

        $response = $this->getJson('/api/v1/artists');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_index_omits_detail_only_relations(): void
    {
        $this->makeArtist();

        $response = $this->getJson('/api/v1/artists');

        $response->assertOk();
        $item = $response->json('data.0');
        $this->assertArrayNotHasKey('exhibitions', $item);
        $this->assertArrayNotHasKey('awards', $item);
        $this->assertArrayNotHasKey('artworks', $item);
    }

    public function test_show_returns_404_for_unknown_or_inactive_slug(): void
    {
        $this->getJson('/api/v1/artists/unknown-slug')->assertStatus(404);

        $inactive = $this->makeArtist(['is_active' => false]);
        $this->getJson("/api/v1/artists/artist-{$inactive->id}")->assertStatus(404);
    }

    public function test_show_includes_exhibitions_and_awards_ordered(): void
    {
        $artist = $this->makeArtist();

        $exhibitionTwo = $artist->exhibitions()->create(['year' => 2021, 'sort_order' => 1]);
        $exhibitionTwo->translations()->create(['locale' => 'az', 'title' => 'İkinci', 'venue' => 'Venue 2']);

        $exhibitionOne = $artist->exhibitions()->create(['year' => 2020, 'sort_order' => 0]);
        $exhibitionOne->translations()->create(['locale' => 'az', 'title' => 'Birinci', 'venue' => 'Venue 1']);

        $award = $artist->awards()->create(['year' => 2019, 'sort_order' => 0]);
        $award->translations()->create(['locale' => 'az', 'title' => 'Mükafat']);

        $response = $this->getJson("/api/v1/artists/artist-{$artist->id}");

        $response->assertOk();
        $exhibitions = $response->json('data.exhibitions');
        $this->assertSame(['Birinci', 'İkinci'], collect($exhibitions)->pluck('title')->all());
        $this->assertSame('Mükafat', $response->json('data.awards.0.title'));
    }

    public function test_show_includes_only_active_public_artworks(): void
    {
        $artist = $this->makeArtist();
        $genre = Genre::factory()->create();
        $medium = Medium::factory()->create();

        $active = Artwork::factory()->create(['artist_id' => $artist->id, 'genre_id' => $genre->id, 'medium_id' => $medium->id, 'is_active' => true]);
        $active->translations()->create(['locale' => 'az', 'slug' => 'aw-'.$active->id, 'title' => 'Active work', 'short_description' => 'S', 'provenance' => 'P']);

        $inactive = Artwork::factory()->create(['artist_id' => $artist->id, 'genre_id' => $genre->id, 'medium_id' => $medium->id, 'is_active' => false]);
        $inactive->translations()->create(['locale' => 'az', 'slug' => 'aw-'.$inactive->id, 'title' => 'Hidden work', 'short_description' => 'S', 'provenance' => 'P']);

        $response = $this->getJson("/api/v1/artists/artist-{$artist->id}");

        $response->assertOk();
        $artworks = $response->json('data.artworks');
        $this->assertCount(1, $artworks);
        $this->assertSame($active->inventory_code, $artworks[0]['inventory_code']);
    }

    public function test_response_never_contains_contact_fields(): void
    {
        $artist = $this->makeArtist();

        $response = $this->getJson("/api/v1/artists/artist-{$artist->id}");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertArrayNotHasKey('email', $data);
        $this->assertArrayNotHasKey('phone', $data);
        $this->assertArrayNotHasKey('address', $data);
    }

    public function test_locale_fallback_per_field(): void
    {
        $artist = $this->makeArtist();
        $artist->translations()->create(['locale' => 'en', 'slug' => 'artist-en-'.$artist->id, 'first_name' => '', 'last_name' => 'Surname EN']);

        $response = $this->getJson("/api/v1/artists/artist-{$artist->id}?locale=en");

        $response->assertOk();
        $this->assertSame('Adı'.$artist->id, $response->json('data.first_name'));
        $this->assertSame('Surname EN', $response->json('data.last_name'));
    }
}
