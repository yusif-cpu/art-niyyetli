<?php

namespace Tests\Feature\Seo;

use App\Enums\PageType;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicPageHttpTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_renders_dynamic_title_and_canonical(): void
    {
        $home = Page::create(['type' => PageType::Home, 'is_active' => true]);
        $home->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'x', 'content' => 'x']);
        $home->sections()->create(['key' => 'hero', 'sort_order' => 0, 'is_active' => true])
            ->translations()->create(['locale' => 'az', 'heading' => 'ArtNiyyətli', 'body' => 'Discover Azerbaijani art.']);

        $response = $this->get('/');

        $response->assertOk();
        $response->assertSee('<title>ArtNiyyətli</title>', false);
        $response->assertSee('<link rel="canonical" href="http://localhost:8080/">', false);
        $response->assertSee('<meta name="robots" content="index, follow">', false);
        $response->assertSee('property="og:title"', false);
        $response->assertSee('application/ld+json', false);
    }

    public function test_artwork_detail_direct_navigation_gets_correct_meta(): void
    {
        $artwork = Artwork::create([
            'artist_id' => Artist::create([])->id,
            'medium_id' => Medium::create(['slug' => 'oil'])->id,
            'genre_id' => Genre::create(['slug' => 'painting'])->id,
            'year_created' => 2023, 'width_cm' => 80, 'height_cm' => 100,
            'price' => 5000, 'inventory_code' => 'AN-HTTP-1', 'is_active' => true,
        ]);
        $artwork->translations()->create(['locale' => 'az', 'slug' => 'x', 'title' => 'Sunset Over Baku', 'short_description' => 'An oil painting.', 'provenance' => 'Acquired directly from the artist.']);
        $artwork->artist->translations()->create(['locale' => 'az', 'slug' => 'a', 'first_name' => 'Aygün', 'last_name' => 'Məmmədova']);

        $response = $this->get('/artworks/AN-HTTP-1');

        $response->assertOk();
        $response->assertSee('<title>Sunset Over Baku | ArtNiyyətli</title>', false);
        $response->assertSee('<link rel="canonical" href="http://localhost:8080/artworks/AN-HTTP-1">', false);
    }

    public function test_a_missing_artwork_returns_a_real_404_status_with_the_same_shell(): void
    {
        $response = $this->get('/artworks/does-not-exist');

        $response->assertStatus(404);
        $response->assertSee('<meta name="robots" content="noindex, follow">', false);
        $response->assertSee('id="public-root"', false); // still the SPA shell, so the client router can still render NotFoundPage
    }

    public function test_a_nonsense_path_returns_404_with_noindex(): void
    {
        $response = $this->get('/this/does/not/exist');

        $response->assertStatus(404);
        $response->assertSee('<meta name="robots" content="noindex, follow">', false);
    }

    public function test_a_404_page_has_no_canonical_link_or_og_url(): void
    {
        // A canonical (or og:url) of "/" here would tell crawlers this 404 IS the homepage.
        $response = $this->get('/this/does/not/exist');

        $response->assertStatus(404);
        $response->assertDontSee('rel="canonical"', false);
        $response->assertDontSee('property="og:url"', false);
    }

    public function test_admin_route_is_unaffected_and_carries_its_own_noindex_tag(): void
    {
        $response = $this->get('/admin');

        $response->assertOk();
        $response->assertSee('<meta name="robots" content="noindex, nofollow">', false);
    }

    public function test_catalogue_alias_route_returns_200_not_404(): void
    {
        // /catalogue used to fall through to the CMS static-page lookup (no such page exists) and 404 at the
        // HTTP level even though the client-side shell still rendered something on top of it.
        $response = $this->get('/catalogue');

        $response->assertOk();
        $response->assertSee('<link rel="canonical" href="http://localhost:8080/artworks">', false);
    }

    public function test_locale_query_param_selects_the_rendered_locale(): void
    {
        $home = Page::create(['type' => PageType::Home, 'is_active' => true]);
        $home->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'x', 'content' => 'x']);
        $home->sections()->create(['key' => 'hero', 'sort_order' => 0, 'is_active' => true])
            ->translations()->create(['locale' => 'en', 'heading' => 'ArtNiyyətli', 'body' => 'Discover Azerbaijani art.']);

        $response = $this->get('/?locale=en');

        $response->assertSee('Discover Azerbaijani art.', false);
    }
}
