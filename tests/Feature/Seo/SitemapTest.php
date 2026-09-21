<?php

namespace Tests\Feature\Seo;

use App\Enums\PageType;
use App\Models\Article;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CountsQueries;
use Tests\TestCase;

class SitemapTest extends TestCase
{
    use CountsQueries, RefreshDatabase;

    public function test_sitemap_always_includes_the_homepage(): void
    {
        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertHeader('content-type', 'application/xml; charset=UTF-8');
        $response->assertSee('<loc>http://localhost:8080/</loc>', false);
    }

    public function test_sitemap_includes_an_active_static_page(): void
    {
        $page = Page::create(['type' => PageType::About, 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'x', 'content' => 'x']);

        $response = $this->get('/sitemap.xml');

        $response->assertSee('<loc>http://localhost:8080/about</loc>', false);
    }

    public function test_sitemap_excludes_the_home_type_page_as_a_slug_entry(): void
    {
        $home = Page::create(['type' => PageType::Home, 'is_active' => true]);
        $home->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'x', 'content' => 'x']);

        $response = $this->get('/sitemap.xml');

        $response->assertDontSee('<loc>http://localhost:8080/home</loc>', false);
    }

    public function test_sitemap_excludes_an_inactive_page(): void
    {
        $page = Page::create(['type' => PageType::Contact, 'is_active' => false]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'contact', 'title' => 'x', 'content' => 'x']);

        $response = $this->get('/sitemap.xml');

        $response->assertDontSee('<loc>http://localhost:8080/contact</loc>', false);
    }

    public function test_sitemap_includes_an_active_artwork_and_excludes_an_inactive_one(): void
    {
        $active = Artwork::create([
            'artist_id' => Artist::create([])->id, 'medium_id' => Medium::firstOrCreate(['slug' => 'oil'])->id,
            'genre_id' => Genre::firstOrCreate(['slug' => 'painting'])->id, 'year_created' => 2023,
            'width_cm' => 10, 'height_cm' => 10, 'price' => 100, 'inventory_code' => 'AN-SITEMAP-1', 'is_active' => true,
        ]);
        $inactive = Artwork::create([
            'artist_id' => Artist::create([])->id, 'medium_id' => Medium::firstOrCreate(['slug' => 'oil'])->id,
            'genre_id' => Genre::firstOrCreate(['slug' => 'painting'])->id, 'year_created' => 2023,
            'width_cm' => 10, 'height_cm' => 10, 'price' => 100, 'inventory_code' => 'AN-SITEMAP-2', 'is_active' => false,
        ]);

        $response = $this->get('/sitemap.xml');

        $response->assertSee('<loc>http://localhost:8080/artworks/AN-SITEMAP-1</loc>', false);
        $response->assertDontSee('<loc>http://localhost:8080/artworks/AN-SITEMAP-2</loc>', false);
    }

    public function test_sitemap_percent_encodes_unicode_slugs_in_every_section(): void
    {
        $page = Page::create(['type' => PageType::About, 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'haqqımızda', 'title' => 'x', 'content' => 'x']);

        $artist = Artist::factory()->create();
        $artist->translations()->create(['locale' => 'az', 'slug' => 'əli-məmmədov', 'first_name' => 'Əli', 'last_name' => 'Məmmədov']);

        $exhibition = Exhibition::factory()->create();
        $exhibition->translations()->create([
            'locale' => 'az', 'slug' => 'yaz-sərgisi', 'title' => 'x', 'venue' => 'x', 'short_text' => 'x', 'full_text' => 'x',
        ]);

        $article = $this->publishedArticle('şuşa-haqqında');

        $body = $this->get('/sitemap.xml')->assertOk()->getContent();

        $this->assertStringContainsString('<loc>http://localhost:8080/'.rawurlencode('haqqımızda').'</loc>', $body);
        $this->assertStringContainsString('<loc>http://localhost:8080/artists/'.rawurlencode('əli-məmmədov').'</loc>', $body);
        $this->assertStringContainsString('<loc>http://localhost:8080/exhibitions/'.rawurlencode('yaz-sərgisi').'</loc>', $body);
        $this->assertStringContainsString('<loc>http://localhost:8080/articles/'.rawurlencode('şuşa-haqqında').'</loc>', $body);
        $this->assertSame('%C9%99li-m%C9%99mm%C9%99dov', rawurlencode('əli-məmmədov'));

        // No raw non-ASCII character may remain in any <loc>.
        preg_match_all('#<loc>(.*?)</loc>#', $body, $locs);
        foreach ($locs[1] as $loc) {
            $this->assertMatchesRegularExpression('#^[\x21-\x7E]+$#', $loc, "Non-ASCII or unencoded <loc>: {$loc}");
        }
    }

    public function test_sitemap_encodes_an_inventory_code_as_a_single_path_segment(): void
    {
        $this->makeArtwork('AN 12/B?x', true);

        $this->get('/sitemap.xml')->assertSee('<loc>http://localhost:8080/artworks/AN%2012%2FB%3Fx</loc>', false);
    }

    public function test_sitemap_lists_exactly_the_expected_urls_in_a_stable_order(): void
    {
        $page = Page::create(['type' => PageType::About, 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'x', 'content' => 'x']);
        $this->makeArtwork('AN-EXACT-1', true);
        $artist = Artist::factory()->create(['is_active' => true]);
        $artist->translations()->create(['locale' => 'az', 'slug' => 'jane-doe', 'first_name' => 'Jane', 'last_name' => 'Doe']);
        $exhibition = Exhibition::factory()->create();
        $exhibition->translations()->create(['locale' => 'az', 'slug' => 'spring', 'title' => 'x', 'venue' => 'x', 'short_text' => 'x', 'full_text' => 'x']);
        $this->publishedArticle('hello-world');

        $body = $this->get('/sitemap.xml')->assertOk()->getContent();
        preg_match_all('#<loc>(.*?)</loc>#', $body, $locs);

        $this->assertSame([
            'http://localhost:8080/',
            'http://localhost:8080/about',
            'http://localhost:8080/artworks/AN-EXACT-1',
            'http://localhost:8080/artists/jane-doe',
            'http://localhost:8080/exhibitions/spring',
            'http://localhost:8080/articles/hello-world',
        ], $locs[1]);

        // <lastmod> is kept for every record (the homepage has none): page, artwork, artist, exhibition, article.
        $this->assertSame(5, preg_match_all('#<lastmod>\d{4}-\d{2}-\d{2}T[\d:]+[+-]\d{2}:\d{2}</lastmod>#', $body));
    }

    public function test_sitemap_uses_the_first_available_slug_when_there_is_no_azerbaijani_one(): void
    {
        $artist = Artist::factory()->create();
        $artist->translations()->create(['locale' => 'en', 'slug' => 'english-only', 'first_name' => 'A', 'last_name' => 'B']);

        $this->get('/sitemap.xml')->assertSee('<loc>http://localhost:8080/artists/english-only</loc>', false);
    }

    public function test_sitemap_omits_inactive_records_and_unpublished_or_scheduled_articles(): void
    {
        $inactiveArtist = Artist::factory()->create(['is_active' => false]);
        $inactiveArtist->translations()->create(['locale' => 'az', 'slug' => 'hidden-artist', 'first_name' => 'A', 'last_name' => 'B']);
        $inactiveExhibition = Exhibition::factory()->create(['is_active' => false]);
        $inactiveExhibition->translations()->create(['locale' => 'az', 'slug' => 'hidden-show', 'title' => 'x', 'venue' => 'x', 'short_text' => 'x', 'full_text' => 'x']);

        $this->publishedArticle('draft-article', ['status' => 'draft']);
        $this->publishedArticle('scheduled-article', ['published_at' => now()->addDay()]);
        $this->publishedArticle('inactive-article', ['is_active' => false]);
        $this->publishedArticle('live-article');

        $body = $this->get('/sitemap.xml')->assertOk()->getContent();

        foreach (['hidden-artist', 'hidden-show', 'draft-article', 'scheduled-article', 'inactive-article'] as $slug) {
            $this->assertStringNotContainsString($slug, $body);
        }
        $this->assertStringContainsString('/articles/live-article', $body);
    }

    /**
     * Records are streamed in id-ordered chunks (SitemapController::CHUNK = 1000); every record on both sides of a
     * chunk boundary must appear exactly once, and the query count must not grow per row.
     *
     * The 50 000-URL protocol cap is far beyond this site (5 000 artworks come to ~6 500 URLs), which is why no
     * sitemap index is generated — see the note in SitemapController.
     */
    public function test_sitemap_covers_every_record_across_chunk_boundaries_without_per_row_queries(): void
    {
        $count = 2050;
        $artistId = Artist::create([])->id;
        $mediumId = Medium::firstOrCreate(['slug' => 'oil'])->id;
        $genreId = Genre::firstOrCreate(['slug' => 'painting'])->id;
        $now = now();

        foreach (array_chunk(range(1, $count), 100) as $numbers) {
            DB::table('artworks')->insert(array_map(fn ($n) => [
                'artist_id' => $artistId, 'medium_id' => $mediumId, 'genre_id' => $genreId, 'year_created' => 2020,
                'width_cm' => 10, 'height_cm' => 10, 'aspect_ratio' => 1, 'price' => 100, 'show_price' => true,
                'availability' => 'available', 'inventory_code' => sprintf('AN-CHUNK-%05d', $n), 'featured' => false,
                'show_on_wall' => false, 'sort_order' => $n, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ], $numbers));
        }

        $body = '';
        $queries = $this->countQueries(function () use (&$body) {
            $body = $this->get('/sitemap.xml')->assertOk()->getContent();
        });

        preg_match_all('#<loc>http://localhost:8080/artworks/(AN-CHUNK-\d{5})</loc>#', $body, $codes);
        $expected = array_map(fn ($n) => sprintf('AN-CHUNK-%05d', $n), range(1, $count));

        $this->assertSame($expected, $codes[1]);
        $this->assertLessThanOrEqual(15, $queries, "Sitemap ran {$queries} queries for {$count} artworks.");
    }

    public function test_sitemap_never_includes_admin_api_or_enquiry_urls(): void
    {
        $response = $this->get('/sitemap.xml');

        $response->assertDontSee('/admin', false);
        $response->assertDontSee('/api', false);
        $response->assertDontSee('enquir', false);
    }

    private function makeArtwork(string $code, bool $active): Artwork
    {
        return Artwork::create([
            'artist_id' => Artist::create([])->id, 'medium_id' => Medium::firstOrCreate(['slug' => 'oil'])->id,
            'genre_id' => Genre::firstOrCreate(['slug' => 'painting'])->id, 'year_created' => 2023,
            'width_cm' => 10, 'height_cm' => 10, 'price' => 100, 'inventory_code' => $code, 'is_active' => $active,
        ]);
    }

    /** @param  array<string, mixed>  $overrides */
    private function publishedArticle(string $slug, array $overrides = []): Article
    {
        $article = Article::factory()->create($overrides + ['status' => 'published', 'published_at' => now()->subDay(), 'is_active' => true]);
        $article->translations()->create(['locale' => 'az', 'slug' => $slug, 'title' => 'x', 'short_text' => 'x', 'content' => 'x']);

        return $article;
    }
}
