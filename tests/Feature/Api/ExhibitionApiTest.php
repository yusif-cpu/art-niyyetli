<?php

namespace Tests\Feature\Api;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Genre;
use App\Models\Medium;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExhibitionApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeExhibition(array $overrides = []): Exhibition
    {
        $exhibition = Exhibition::factory()->create(array_merge(['is_active' => true], $overrides));
        $exhibition->translations()->create([
            'locale' => 'az',
            'slug' => 'exhibition-'.$exhibition->id,
            'title' => 'Sərgi '.$exhibition->id,
            'venue' => 'Venue',
            'short_text' => 'Short',
            'full_text' => 'Full',
        ]);

        return $exhibition;
    }

    public function test_excludes_inactive_and_soft_deleted(): void
    {
        $this->makeExhibition(['is_active' => true]);
        $this->makeExhibition(['is_active' => false]);
        $deleted = $this->makeExhibition(['is_active' => true]);
        $deleted->delete();

        $response = $this->getJson('/api/v1/exhibitions');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_filter_current_upcoming_archive(): void
    {
        $this->makeExhibition(['status' => 'current']);
        $this->makeExhibition(['status' => 'upcoming']);
        $this->makeExhibition(['status' => 'past']);

        $current = $this->getJson('/api/v1/exhibitions?filter=current')->json('data');
        $this->assertCount(1, $current);
        $this->assertSame('current', $current[0]['status']);

        $upcoming = $this->getJson('/api/v1/exhibitions?filter=upcoming')->json('data');
        $this->assertCount(1, $upcoming);
        $this->assertSame('upcoming', $upcoming[0]['status']);

        $archive = $this->getJson('/api/v1/exhibitions?filter=archive')->json('data');
        $this->assertCount(1, $archive);
        $this->assertSame('past', $archive[0]['status']);
    }

    public function test_invalid_filter_returns_422(): void
    {
        $this->getJson('/api/v1/exhibitions?filter=not-real')->assertStatus(422);
    }

    public function test_show_returns_404_for_unknown_or_inactive_slug(): void
    {
        $this->getJson('/api/v1/exhibitions/unknown')->assertStatus(404);

        $inactive = $this->makeExhibition(['is_active' => false]);
        $this->getJson("/api/v1/exhibitions/exhibition-{$inactive->id}")->assertStatus(404);
    }

    public function test_show_includes_artists_and_excludes_inactive_artworks(): void
    {
        $exhibition = $this->makeExhibition();
        $artist = Artist::factory()->create(['is_active' => true]);
        $artist->translations()->create(['locale' => 'az', 'slug' => 'artist-'.$artist->id, 'first_name' => 'Ad', 'last_name' => 'Soyad']);
        $exhibition->artists()->attach($artist->id, ['sort_order' => 0]);

        $genre = Genre::factory()->create();
        $medium = Medium::factory()->create();

        $activeArtwork = Artwork::factory()->create(['artist_id' => $artist->id, 'genre_id' => $genre->id, 'medium_id' => $medium->id, 'is_active' => true]);
        $activeArtwork->translations()->create(['locale' => 'az', 'slug' => 'aw-'.$activeArtwork->id, 'title' => 'Active', 'short_description' => 'S', 'provenance' => 'P']);
        $exhibition->artworks()->attach($activeArtwork->id, ['sort_order' => 0]);

        $inactiveArtwork = Artwork::factory()->create(['artist_id' => $artist->id, 'genre_id' => $genre->id, 'medium_id' => $medium->id, 'is_active' => false]);
        $inactiveArtwork->translations()->create(['locale' => 'az', 'slug' => 'aw-'.$inactiveArtwork->id, 'title' => 'Hidden', 'short_description' => 'S', 'provenance' => 'P']);
        $exhibition->artworks()->attach($inactiveArtwork->id, ['sort_order' => 1]);

        $response = $this->getJson("/api/v1/exhibitions/exhibition-{$exhibition->id}");

        $response->assertOk();
        $this->assertCount(1, $response->json('data.artists'));
        $artworks = $response->json('data.artworks');
        $this->assertCount(1, $artworks);
        $this->assertSame($activeArtwork->inventory_code, $artworks[0]['inventory_code']);
    }
}
