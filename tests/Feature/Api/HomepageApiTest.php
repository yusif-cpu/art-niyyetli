<?php

namespace Tests\Feature\Api;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Faq;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Page;
use App\Models\SocialLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomepageApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeHomePage(): Page
    {
        $page = Page::factory()->create(['type' => 'home', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'Content']);
        $hero = $page->sections()->create(['key' => 'hero', 'sort_order' => 0, 'is_active' => true]);
        $hero->translations()->create(['locale' => 'az', 'heading' => 'Xoş gəldiniz', 'body' => 'Slogan']);

        return $page;
    }

    private function makeArtwork(array $overrides = []): Artwork
    {
        $artist = $overrides['artist_id'] ?? Artist::factory()->create()->id;
        $genre = $overrides['genre_id'] ?? Genre::factory()->create()->id;
        $medium = $overrides['medium_id'] ?? Medium::factory()->create()->id;

        $artwork = Artwork::factory()->create(array_merge([
            'artist_id' => $artist, 'genre_id' => $genre, 'medium_id' => $medium, 'is_active' => true,
        ], $overrides));
        $artwork->translations()->create(['locale' => 'az', 'slug' => 'aw-'.$artwork->id, 'title' => 'T'.$artwork->id, 'short_description' => 'S', 'provenance' => 'P']);

        return $artwork;
    }

    public function test_stats_reflect_active_only_counts(): void
    {
        Artist::factory()->create(['is_active' => true]);
        Artist::factory()->create(['is_active' => false]);

        $response = $this->getJson('/api/v1/homepage');

        $response->assertOk();
        $this->assertSame(1, $response->json('data.stats.artists'));
    }

    public function test_wall_contains_only_show_on_wall_artworks_in_order(): void
    {
        $second = $this->makeArtwork(['show_on_wall' => true, 'sort_order' => 1]);
        $first = $this->makeArtwork(['show_on_wall' => true, 'sort_order' => 0]);
        $this->makeArtwork(['show_on_wall' => false]);

        $response = $this->getJson('/api/v1/homepage');

        $response->assertOk();
        $wall = collect($response->json('data.wall'))->pluck('inventory_code')->all();
        $this->assertSame([$first->inventory_code, $second->inventory_code], $wall);
    }

    public function test_featured_capped_at_6(): void
    {
        for ($i = 0; $i < 8; $i++) {
            $this->makeArtwork(['featured' => true, 'sort_order' => $i]);
        }

        $response = $this->getJson('/api/v1/homepage');

        $response->assertOk();
        $this->assertCount(6, $response->json('data.featured'));
    }

    public function test_exhibition_prefers_current_over_upcoming(): void
    {
        $upcoming = Exhibition::factory()->create(['status' => 'upcoming', 'is_active' => true, 'start_date' => now()->addMonth(), 'end_date' => now()->addMonths(2)]);
        $upcoming->translations()->create(['locale' => 'az', 'slug' => 'upcoming', 'title' => 'Upcoming', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $current = Exhibition::factory()->create(['status' => 'current', 'is_active' => true, 'start_date' => now()->subDay(), 'end_date' => now()->addWeek()]);
        $current->translations()->create(['locale' => 'az', 'slug' => 'current', 'title' => 'Current', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $response = $this->getJson('/api/v1/homepage');

        $response->assertOk();
        $this->assertSame('current', $response->json('data.exhibition.status'));
    }

    public function test_exhibition_falls_back_to_nearest_upcoming(): void
    {
        $later = Exhibition::factory()->create(['status' => 'upcoming', 'is_active' => true, 'start_date' => now()->addMonths(3), 'end_date' => now()->addMonths(4)]);
        $later->translations()->create(['locale' => 'az', 'slug' => 'later', 'title' => 'Later', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $sooner = Exhibition::factory()->create(['status' => 'upcoming', 'is_active' => true, 'start_date' => now()->addWeek(), 'end_date' => now()->addMonth()]);
        $sooner->translations()->create(['locale' => 'az', 'slug' => 'sooner', 'title' => 'Sooner', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $response = $this->getJson('/api/v1/homepage');

        $response->assertOk();
        $this->assertSame('sooner', $response->json('data.exhibition.slug'));
    }

    public function test_exhibition_null_when_none_exist(): void
    {
        $response = $this->getJson('/api/v1/homepage');

        $response->assertOk();
        $this->assertNull($response->json('data.exhibition'));
    }

    public function test_faqs_scoped_to_home_page_only(): void
    {
        $home = $this->makeHomePage();
        $otherPage = Page::factory()->create(['type' => 'about', 'is_active' => true]);
        $otherPage->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'Haqqımızda', 'content' => 'C']);

        $homeFaq = Faq::factory()->create(['page_id' => $home->id, 'is_active' => true]);
        $homeFaq->translations()->create(['locale' => 'az', 'question' => 'Home Q', 'answer' => 'Home A']);

        $otherFaq = Faq::factory()->create(['page_id' => $otherPage->id, 'is_active' => true]);
        $otherFaq->translations()->create(['locale' => 'az', 'question' => 'Other Q', 'answer' => 'Other A']);

        $response = $this->getJson('/api/v1/homepage');

        $response->assertOk();
        $questions = collect($response->json('data.faqs'))->pluck('question')->all();
        $this->assertSame(['Home Q'], $questions);
    }

    public function test_social_links_match_dedicated_endpoint(): void
    {
        SocialLink::factory()->create(['platform' => 'instagram', 'is_active' => true, 'sort_order' => 0]);

        $homepage = $this->getJson('/api/v1/homepage')->json('data.social_links');
        $dedicated = $this->getJson('/api/v1/social-links')->json('data');

        $this->assertSame($dedicated, $homepage);
    }

    public function test_page_sections_match_pages_endpoint(): void
    {
        $this->makeHomePage();

        $homepageSections = $this->getJson('/api/v1/homepage')->json('data.page.sections');
        $pagesSections = $this->getJson('/api/v1/pages/home')->json('data.sections');

        $this->assertSame($pagesSections, $homepageSections);
    }

    public function test_wall_is_capped_by_the_configured_limit_keeping_curator_order(): void
    {
        config(['gallery.wall_limit' => 2]);
        $third = $this->makeArtwork(['show_on_wall' => true, 'sort_order' => 2]);
        $first = $this->makeArtwork(['show_on_wall' => true, 'sort_order' => 0]);
        $second = $this->makeArtwork(['show_on_wall' => true, 'sort_order' => 1]);

        $wall = collect($this->getJson('/api/v1/homepage')->json('data.wall'))->pluck('inventory_code')->all();

        $this->assertSame([$first->inventory_code, $second->inventory_code], $wall);
        $this->assertNotContains($third->inventory_code, $wall);
    }

    public function test_wall_limit_defaults_to_sixteen_and_ignores_query_parameters(): void
    {
        $this->assertSame(16, config('gallery.wall_limit'));

        config(['gallery.wall_limit' => 1]);
        $this->makeArtwork(['show_on_wall' => true, 'sort_order' => 0]);
        $this->makeArtwork(['show_on_wall' => true, 'sort_order' => 1]);

        $this->assertCount(1, $this->getJson('/api/v1/homepage?wall_limit=50&limit=50')->json('data.wall'));
    }

    public function test_artists_without_a_usable_az_translation_are_not_listed(): void
    {
        $usable = Artist::factory()->create(['is_active' => true]);
        $usable->translations()->create(['locale' => 'az', 'slug' => 'ok', 'first_name' => 'A', 'last_name' => 'B']);
        Artist::factory()->create(['is_active' => true]);
        $enOnly = Artist::factory()->create(['is_active' => true]);
        $enOnly->translations()->create(['locale' => 'en', 'slug' => 'en-only', 'first_name' => 'C', 'last_name' => 'D']);

        $artists = $this->getJson('/api/v1/homepage')->json('data.artists');

        $this->assertSame(['ok'], collect($artists)->pluck('slug')->all());
    }
}
