<?php

namespace Tests\Feature\Schema;

use App\Models\Artist;
use App\Models\ArtistTranslation;
use App\Models\Artwork;
use App\Models\ArtworkTranslation;
use App\Models\Exhibition;
use App\Models\ExhibitionTranslation;
use App\Models\Genre;
use App\Models\Medium;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoContentSeederTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, int> */
    private function counts(): array
    {
        return [
            'artists' => Artist::withTrashed()->count(),
            'artist_translations' => ArtistTranslation::query()->count(),
            'artworks' => Artwork::withTrashed()->count(),
            'artwork_translations' => ArtworkTranslation::query()->count(),
            'exhibitions' => Exhibition::withTrashed()->count(),
            'exhibition_translations' => ExhibitionTranslation::query()->count(),
            'genres' => Genre::query()->count(),
            'mediums' => Medium::query()->count(),
            'exhibition_artists' => \DB::table('exhibition_artists')->count(),
            'exhibition_artworks' => \DB::table('exhibition_artworks')->count(),
        ];
    }

    public function test_it_creates_four_artists_eight_artworks_and_two_exhibitions_in_both_locales(): void
    {
        $this->seed(DemoContentSeeder::class);

        $counts = $this->counts();
        $this->assertSame(4, $counts['artists']);
        $this->assertSame(8, $counts['artist_translations']); // az + en per artist
        $this->assertSame(8, $counts['artworks']);
        $this->assertSame(16, $counts['artwork_translations']);
        $this->assertSame(2, $counts['exhibitions']);
        $this->assertSame(4, $counts['exhibition_translations']);
        $this->assertSame(4, $counts['exhibition_artists']);
        $this->assertSame(8, $counts['exhibition_artworks']);
    }

    public function test_running_it_again_creates_no_duplicates(): void
    {
        $this->seed(DemoContentSeeder::class);
        $first = $this->counts();

        $this->seed(DemoContentSeeder::class);
        $this->seed(DemoContentSeeder::class);

        $this->assertSame($first, $this->counts());
    }

    public function test_it_reuses_existing_genres_and_mediums(): void
    {
        $existing = Genre::factory()->create(['slug' => 'painting']);

        $this->seed(DemoContentSeeder::class);

        $this->assertSame(1, Genre::query()->where('slug', 'painting')->count());
        $this->assertTrue(Artwork::query()->where('genre_id', $existing->id)->exists());
    }

    public function test_every_record_is_marked_as_demo_content(): void
    {
        $this->seed(DemoContentSeeder::class);

        $this->assertSame(0, Artwork::query()->where('inventory_code', 'not like', 'DEMO-%')->count());
        $this->assertSame(0, ArtworkTranslation::query()->where('slug', 'not like', 'demo-%')->count());
        $this->assertSame(0, ArtistTranslation::query()->where('slug', 'not like', 'demo-%')->count());
        $this->assertSame(0, ExhibitionTranslation::query()->where('slug', 'not like', 'demo-%')->count());
        $this->assertSame(0, ArtworkTranslation::query()->where('short_description', 'not like', '[Demo]%')->count());
    }

    public function test_relationships_are_valid_and_the_content_is_publicly_visible(): void
    {
        $this->seed(DemoContentSeeder::class);

        // Every artwork has an artist, genre and medium, and each artist has two.
        Artwork::query()->with(['artist', 'genre', 'medium'])->get()->each(function (Artwork $artwork) {
            $this->assertNotNull($artwork->artist);
            $this->assertNotNull($artwork->genre);
            $this->assertNotNull($artwork->medium);
        });
        Artist::query()->withCount('artworks')->get()->each(fn ($artist) => $this->assertSame(2, $artist->artworks_count));

        $homepage = $this->getJson('/api/v1/homepage')->assertOk()->json('data');
        $this->assertCount(1, $homepage['exhibitions']['current']);
        $this->assertCount(1, $homepage['exhibitions']['upcoming']);
        $this->assertCount(4, $homepage['artists']);
        $this->assertCount(2, $homepage['exhibitions']['current'][0]['artists']);
        $this->assertCount(4, $homepage['exhibitions']['upcoming'][0]['artworks']);

        $this->getJson('/api/v1/artworks?locale=en')->assertOk()->assertJsonCount(8, 'data');
        $this->getJson('/api/v1/artworks/DEMO-2026-001?locale=en')->assertOk()->assertJsonPath('data.title', 'Morning Light');
    }

    public function test_it_includes_a_hidden_price_and_a_sold_artwork_for_realistic_states(): void
    {
        $this->seed(DemoContentSeeder::class);

        $this->assertSame(1, Artwork::query()->where('show_price', false)->count());
        $this->assertSame(1, Artwork::query()->where('availability', 'sold')->count());
    }

    public function test_it_restores_a_soft_deleted_demo_record_instead_of_duplicating_it(): void
    {
        $this->seed(DemoContentSeeder::class);
        $before = $this->counts();
        Artwork::query()->where('inventory_code', 'DEMO-2026-001')->firstOrFail()->delete();
        Exhibition::query()->firstOrFail()->delete();

        $this->seed(DemoContentSeeder::class);

        $this->assertSame($before, $this->counts());
        $this->assertNotNull(Artwork::query()->where('inventory_code', 'DEMO-2026-001')->first());
        $this->assertSame(2, Exhibition::query()->count());
    }

    public function test_reruns_keep_admin_edits_to_texts_but_refresh_the_exhibition_status(): void
    {
        $this->seed(DemoContentSeeder::class);
        Artwork::query()->where('inventory_code', 'DEMO-2026-001')->firstOrFail()->translations()->where('locale', 'az')->update(['title' => 'Redaktə olunub']);
        Exhibition::query()->whereHas('translations', fn ($q) => $q->where('slug', 'demo-cari-serge'))->update(['status' => 'past']);

        $this->seed(DemoContentSeeder::class);

        $this->assertSame('Redaktə olunub', Artwork::query()->where('inventory_code', 'DEMO-2026-001')->firstOrFail()->translations()->where('locale', 'az')->value('title'));
        $this->assertSame('current', Exhibition::query()->whereHas('translations', fn ($q) => $q->where('slug', 'demo-cari-serge'))->firstOrFail()->status->value);
    }

    public function test_it_refuses_to_run_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->app->make(DemoContentSeeder::class)->run(); // called directly: `db:seed` itself would prompt in production

        $this->assertSame(0, Artist::query()->count());
        $this->assertSame(0, Artwork::query()->count());
    }

    public function test_the_regular_seeder_never_adds_demo_content(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(0, Artist::query()->count());
        $this->assertSame(0, Artwork::query()->count());
        $this->assertSame(0, Exhibition::query()->count());
        $this->assertStringNotContainsString('DemoContentSeeder', (string) file_get_contents(database_path('seeders/DatabaseSeeder.php')));
    }
}
