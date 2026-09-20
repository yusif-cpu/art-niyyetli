<?php

namespace Tests\Feature\Performance;

use App\Enums\PageType;
use App\Http\Middleware\BumpPublicContentVersion;
use App\Mail\NewEnquiryReceived;
use App\Models\Article;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Faq;
use App\Models\NavigationItem;
use App\Models\Page;
use App\Models\Role;
use App\Models\SiteSetting;
use App\Models\SocialLink;
use App\Models\User;
use App\Support\Cache\PublicContentCache;
use Database\Seeders\BenchmarkSeeder;
use Illuminate\Contracts\Cache\Factory as CacheFactory;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use ReflectionProperty;
use RuntimeException;
use Tests\Support\CountsQueries;
use Tests\TestCase;

/**
 * Phase 12 Task 9 (P-03): what is cached, what the cache key varies by, and that every admin write makes the change
 * public at once — so an inactive, unpublished or deleted record never stays visible through a stale entry.
 */
class PublicCacheInvalidationTest extends TestCase
{
    use CountsQueries, RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware([ThrottleRequests::class, PreventRequestForgery::class]);

        $this->admin = User::factory()->create(['username' => 'cache.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    // -- Fixtures ------------------------------------------------------------

    private function homePage(): Page
    {
        $page = Page::create(['type' => PageType::Home, 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'x']);
        $page->translations()->create(['locale' => 'en', 'slug' => 'home', 'title' => 'Home', 'content' => 'x']);

        return $page;
    }

    private function artwork(string $az, string $en, array $attributes = []): Artwork
    {
        $artwork = Artwork::factory()->create(array_merge(['is_active' => true, 'show_on_wall' => true], $attributes));
        $artwork->translations()->create(['locale' => 'az', 'slug' => 'az-'.$artwork->id, 'title' => $az, 'short_description' => 's', 'provenance' => 'p']);
        $artwork->translations()->create(['locale' => 'en', 'slug' => 'en-'.$artwork->id, 'title' => $en, 'short_description' => 's', 'provenance' => 'p']);

        return $artwork;
    }

    private function artist(string $first, string $last): Artist
    {
        $artist = Artist::factory()->create();
        $artist->translations()->create(['locale' => 'az', 'slug' => 'a-'.$artist->id, 'first_name' => $first, 'last_name' => $last]);

        return $artist;
    }

    private function navPage(string $az, string $en, string $slug): Page
    {
        $page = Page::create(['type' => PageType::Custom, 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => $slug, 'title' => $az, 'content' => 'x']);
        $page->translations()->create(['locale' => 'en', 'slug' => $slug, 'title' => $en, 'content' => 'x']);
        NavigationItem::factory()->create(['nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null, 'placement' => 'header']);

        return $page;
    }

    // -- Helpers -------------------------------------------------------------

    /** @return array<string, mixed> */
    private function api(string $url): array
    {
        return $this->getJson($url)->assertOk()->json();
    }

    /** @return array<int, string> the titles of the header's page items (the migrations also seed route items, which have none) */
    private function headerPageTitles(string $url = '/api/v1/navigation'): array
    {
        $items = array_filter($this->api($url)['data']['header'], fn (array $item) => $item['type'] === 'page');

        return array_values(array_column($items, 'title'));
    }

    /** @return array<int, string> */
    private function wallCodes(string $url = '/api/v1/homepage'): array
    {
        return array_column($this->api($url)['data']['wall'], 'inventory_code');
    }

    /** @return array<int, string> the logical names (entry prefix stripped) of every public-content entry in the store */
    private function cachedKeys(): array
    {
        $store = Cache::store()->getStore();
        $storage = (new ReflectionProperty($store, 'storage'))->getValue($store);
        $names = [];

        foreach (array_keys($storage) as $key) {
            if (preg_match('/^public-content:entry:(.+)$/', $key, $m) === 1) {
                $names[$m[1]] = true;
            }
        }

        $names = array_keys($names);
        sort($names);

        return $names;
    }

    private function version(): string
    {
        return app(PublicContentCache::class)->version();
    }

    private function asAdmin(): static
    {
        return $this->actingAs($this->admin);
    }

    // -- Locale separation ---------------------------------------------------

    public function test_locales_never_leak_into_each_other_whichever_is_requested_first(): void
    {
        $this->homePage();
        $this->navPage('Haqqımızda', 'About', 'about-us');

        // en first, then az, then en again, then everything that must fall back to az.
        foreach ([
            ['?locale=en', 'Home', 'About'], ['?locale=az', 'Ana səhifə', 'Haqqımızda'], ['?locale=en', 'Home', 'About'],
            ['', 'Ana səhifə', 'Haqqımızda'], ['?locale=xx', 'Ana səhifə', 'Haqqımızda'], ['?locale=', 'Ana səhifə', 'Haqqımızda'],
            ['?locale=EN', 'Ana səhifə', 'Haqqımızda'], ['?locale[]=en', 'Ana səhifə', 'Haqqımızda'], ['?locale=en', 'Home', 'About'],
        ] as [$query, $homeTitle, $navTitle]) {
            $this->assertSame($homeTitle, $this->api("/api/v1/homepage{$query}")['data']['page']['title'], "homepage {$query}");
            $this->assertSame([$navTitle], $this->headerPageTitles("/api/v1/navigation{$query}"), "navigation {$query}");
        }
    }

    public function test_an_unknown_locale_is_normalised_before_keying_so_the_key_space_is_bounded(): void
    {
        $this->homePage();

        $this->api('/api/v1/homepage'); // fills the az entry
        $this->api('/api/v1/navigation');

        foreach (range(1, 30) as $i) {
            $garbage = ['locale' => "garbage-{$i}"];
            $queries = $this->countQueries(function () use ($garbage) {
                $this->getJson('/api/v1/homepage?'.http_build_query($garbage))->assertOk();
                $this->getJson('/api/v1/navigation?'.http_build_query($garbage))->assertOk();
            });

            $this->assertSame(0, $queries, "an unknown locale [{$garbage['locale']}] must reuse the az entry, not build a new one");
        }

        $this->assertSame(['homepage:az', 'navigation:az'], $this->cachedKeys());

        $this->api('/api/v1/homepage?locale=en');
        $this->assertSame(['homepage:az', 'homepage:en', 'navigation:az'], $this->cachedKeys());
    }

    // -- What is cached, and only that ----------------------------------------

    public function test_only_the_planned_payloads_are_stored_and_nothing_depends_on_filters_or_pagination(): void
    {
        $handles = (new BenchmarkSeeder)->populate(30);

        foreach ([
            '/api/v1/homepage', '/api/v1/homepage?locale=en', '/api/v1/navigation', '/api/v1/site-settings', '/api/v1/social-links', '/api/v1/faqs',
            '/api/v1/pages', "/api/v1/pages/{$handles['page_slug']}", '/api/v1/artworks', '/api/v1/artworks?page=2', '/api/v1/artworks?per_page=5&page=3',
            '/api/v1/artworks?genre=bench-genre-0', '/api/v1/artworks?medium=bench-medium-0&sort=price_desc', '/api/v1/artworks?status=available&locale=en',
            "/api/v1/artworks/{$handles['artwork_code']}", '/api/v1/artists', "/api/v1/artists/{$handles['artist_slug']}", '/api/v1/exhibitions',
            '/api/v1/exhibitions?filter=current', "/api/v1/exhibitions/{$handles['exhibition_slug']}", '/api/v1/articles', '/api/v1/articles?page=2',
            "/api/v1/articles/{$handles['article_slug']}", '/api/v1/enquiry-subjects', '/sitemap.xml',
        ] as $url) {
            $this->get($url);
        }

        $this->assertSame(
            ['homepage:az', 'homepage:en', 'navigation:az', 'site-settings', 'sitemap'],
            $this->cachedKeys(),
            'catalogue, detail, list, filter, sort and page requests must never create application cache entries'
        );
    }

    public function test_catalogue_filters_sorting_and_pagination_never_share_a_response(): void
    {
        (new BenchmarkSeeder)->populate(30);

        $urls = [
            'all' => '/api/v1/artworks', 'page2' => '/api/v1/artworks?page=2', 'small' => '/api/v1/artworks?per_page=5',
            'genre0' => '/api/v1/artworks?genre=bench-genre-0', 'genre1' => '/api/v1/artworks?genre=bench-genre-1',
            'asc' => '/api/v1/artworks?sort=price_asc', 'desc' => '/api/v1/artworks?sort=price_desc',
            'en' => '/api/v1/artworks?locale=en', 'genre0-en-desc' => '/api/v1/artworks?genre=bench-genre-0&locale=en&sort=price_desc',
        ];

        // Two full rounds in a different order: every URL must keep returning its own body.
        $bodies = [];
        foreach ([$urls, array_reverse($urls, true)] as $round) {
            foreach ($round as $name => $url) {
                $body = $this->getJson($url)->assertOk()->getContent();
                $bodies[$name] ??= $body;
                $this->assertSame($bodies[$name], $body, "{$name} changed between two identical requests");
            }
        }

        $this->assertCount(count($bodies), array_unique($bodies), 'no two of these different requests may return the same body');

        $genre0 = json_decode($bodies['genre0'], true)['data'];
        $genre1 = json_decode($bodies['genre1'], true)['data'];
        $this->assertNotEmpty($genre0);
        $this->assertNotEmpty($genre1);
        $this->assertSame(['bench-genre-0'], array_values(array_unique(array_column(array_column($genre0, 'genre'), 'slug'))));
        $this->assertSame(['bench-genre-1'], array_values(array_unique(array_column(array_column($genre1, 'genre'), 'slug'))));
        $this->assertCount(5, json_decode($bodies['small'], true)['data']);
        $this->assertSame(2, json_decode($bodies['page2'], true)['meta']['current_page']);

        $prices = fn (string $name) => array_values(array_filter(array_column(json_decode($bodies[$name], true)['data'], 'price'), fn ($p) => $p !== null));
        $asc = $prices('asc');
        $desc = $prices('desc');
        $sortedAsc = $asc;
        sort($sortedAsc);
        $sortedDesc = $desc;
        rsort($sortedDesc);
        $this->assertSame($sortedAsc, $asc);
        $this->assertSame($sortedDesc, $desc);
    }

    // -- Invalidation through the admin --------------------------------------

    public function test_a_settings_change_is_public_at_once_and_the_admin_response_is_never_stale(): void
    {
        $this->asAdmin()->putJson('/admin/settings', ['brand_text' => 'First brand', 'contact_email' => 'first@example.org'])->assertOk();
        $this->assertSame('First brand', $this->api('/api/v1/site-settings')['data']['brand_text']);

        $response = $this->asAdmin()->putJson('/admin/settings', ['brand_text' => 'Second brand'])->assertOk();

        $this->assertSame('Second brand', $response->json('data.brand_text'), 'the response to a save must not come from the old cache entry');
        $this->assertSame('Second brand', $this->api('/api/v1/site-settings')['data']['brand_text']);
        $this->assertSame('Second brand', $this->asAdmin()->getJson('/admin/settings')->json('data.brand_text'));
    }

    public function test_an_artwork_that_is_deactivated_or_deleted_leaves_the_homepage_immediately(): void
    {
        $this->homePage();
        $keep = $this->artwork('Qalır', 'Stays');
        $deactivate = $this->artwork('Deaktiv', 'Deactivated');
        $delete = $this->artwork('Silinir', 'Deleted');

        $this->assertEqualsCanonicalizing([$keep->inventory_code, $deactivate->inventory_code, $delete->inventory_code], $this->wallCodes());
        $this->assertSame(3, $this->api('/api/v1/homepage')['data']['stats']['artworks']);

        $this->asAdmin()->putJson("/admin/artworks/{$deactivate->id}", ['is_active' => false])->assertOk();
        $this->assertEqualsCanonicalizing([$keep->inventory_code, $delete->inventory_code], $this->wallCodes());

        $this->asAdmin()->deleteJson("/admin/artworks/{$delete->id}")->assertOk();
        $this->assertSame([$keep->inventory_code], $this->wallCodes());
        $this->assertSame(1, $this->api('/api/v1/homepage')['data']['stats']['artworks']);
        $this->assertSame([$keep->inventory_code], $this->wallCodes('/api/v1/homepage?locale=en'), 'every locale is invalidated together');
    }

    public function test_a_content_edit_is_visible_in_every_locale_at_once(): void
    {
        $this->homePage();
        $artwork = $this->artwork('Köhnə ad', 'Old title');
        $this->api('/api/v1/homepage');
        $this->api('/api/v1/homepage?locale=en');

        $this->asAdmin()->putJson("/admin/artworks/{$artwork->id}", ['translations' => [
            ['locale' => 'az', 'slug' => 'yeni-ad', 'title' => 'Yeni ad', 'short_description' => 's', 'provenance' => 'p'],
            ['locale' => 'en', 'slug' => 'new-title', 'title' => 'New title', 'short_description' => 's', 'provenance' => 'p'],
        ]])->assertOk();

        $this->assertSame('Yeni ad', $this->api('/api/v1/homepage')['data']['wall'][0]['title']);
        $this->assertSame('New title', $this->api('/api/v1/homepage?locale=en')['data']['wall'][0]['title']);
    }

    public function test_an_artist_exhibition_faq_social_link_and_section_leave_the_homepage_when_deactivated(): void
    {
        $home = $this->homePage();
        $artist = $this->artist('Aygün', 'Məmmədova');
        $exhibition = Exhibition::factory()->create(['status' => 'current', 'is_active' => true]);
        $exhibition->translations()->create(['locale' => 'az', 'slug' => 'serg', 'title' => 'Sərgi', 'venue' => 'Qalereya', 'short_text' => 's', 'full_text' => 'f']);
        $faq = Faq::factory()->create(['page_id' => $home->id]);
        $faq->translations()->create(['locale' => 'az', 'question' => 'Sual?', 'answer' => 'Cavab.']);
        $link = SocialLink::factory()->create(['platform' => 'instagram']);
        $section = $home->sections()->create(['key' => 'hero', 'sort_order' => 0, 'is_active' => true]);
        $section->translations()->create(['locale' => 'az', 'heading' => 'Salam', 'body' => 'Mətn']);

        $data = $this->api('/api/v1/homepage')['data'];
        $this->assertCount(1, $data['artists']);
        $this->assertNotNull($data['exhibition']);
        $this->assertCount(1, $data['faqs']);
        $this->assertCount(1, $data['social_links']);
        $this->assertCount(1, $data['page']['sections']);

        $this->asAdmin()->putJson("/admin/artists/{$artist->id}", ['is_active' => false])->assertOk();
        $this->assertCount(0, $this->api('/api/v1/homepage')['data']['artists']);

        $this->asAdmin()->putJson("/admin/exhibitions/{$exhibition->id}", ['is_active' => false])->assertOk();
        $this->assertNull($this->api('/api/v1/homepage')['data']['exhibition']);

        $this->asAdmin()->putJson("/admin/faqs/{$faq->id}", ['is_active' => false])->assertOk();
        $this->assertCount(0, $this->api('/api/v1/homepage')['data']['faqs']);

        $this->asAdmin()->putJson("/admin/social-links/{$link->id}", ['is_active' => false])->assertOk();
        $this->assertCount(0, $this->api('/api/v1/homepage')['data']['social_links']);
        $this->assertCount(0, $this->api('/api/v1/social-links')['data']);

        $this->asAdmin()->putJson("/admin/pages/sections/{$section->id}", ['is_active' => false])->assertOk();
        $this->assertCount(0, $this->api('/api/v1/homepage')['data']['page']['sections']);

        $this->asAdmin()->putJson("/admin/pages/{$home->id}", ['is_active' => false])->assertOk();
        $this->assertNull($this->api('/api/v1/homepage')['data']['page']);
    }

    public function test_navigation_follows_page_and_menu_edits_immediately_in_both_locales(): void
    {
        $page = $this->navPage('Haqqımızda', 'About', 'about-us');
        $item = NavigationItem::query()->where('page_id', $page->id)->first();
        $seededRoute = NavigationItem::query()->where('nav_type', 'route')->where('placement', 'header')->firstOrFail();
        $headerCount = fn (string $q = '') => count($this->api("/api/v1/navigation{$q}")['data']['header']);
        $before = $headerCount();

        $this->assertSame(['Haqqımızda'], $this->headerPageTitles());
        $this->assertSame(['About'], $this->headerPageTitles('/api/v1/navigation?locale=en'));

        // A retitled page shows its new title in both locales.
        $this->asAdmin()->putJson("/admin/pages/{$page->id}", ['translations' => [
            ['locale' => 'az', 'slug' => 'haqqimizda', 'title' => 'Bizim haqqımızda', 'content' => 'x'],
            ['locale' => 'en', 'slug' => 'about-us', 'title' => 'About us', 'content' => 'x'],
        ]])->assertOk();
        $this->assertSame(['Bizim haqqımızda'], $this->headerPageTitles());
        $this->assertSame(['About us'], $this->headerPageTitles('/api/v1/navigation?locale=en'));

        // A hidden menu item disappears and comes back.
        $this->asAdmin()->putJson("/admin/navigation/{$seededRoute->id}", ['is_visible' => false])->assertOk();
        $this->assertSame($before - 1, $headerCount());
        $this->assertSame($before - 1, $headerCount('?locale=en'));
        $this->asAdmin()->putJson("/admin/navigation/{$seededRoute->id}", ['is_visible' => true])->assertOk();
        $this->assertSame($before, $headerCount());

        // Deleting a menu item removes it.
        $this->asAdmin()->deleteJson("/admin/navigation/{$item->id}")->assertOk();
        $this->assertSame([], $this->headerPageTitles());
        $this->assertSame($before - 1, $headerCount());
    }

    public function test_deactivating_a_page_removes_its_navigation_entry_even_though_the_item_stays_visible(): void
    {
        $page = $this->navPage('Haqqımızda', 'About', 'about-us');
        $this->assertSame(['Haqqımızda'], $this->headerPageTitles());
        $this->assertSame(['About'], $this->headerPageTitles('/api/v1/navigation?locale=en'));

        $this->asAdmin()->putJson("/admin/pages/{$page->id}", ['is_active' => false])->assertOk();

        $this->assertSame([], $this->headerPageTitles());
        $this->assertSame([], $this->headerPageTitles('/api/v1/navigation?locale=en'));
    }

    public function test_the_sitemap_drops_anything_deactivated_or_deleted_immediately(): void
    {
        $artwork = $this->artwork('Əsər', 'Work');
        $page = $this->navPage('Səhifə', 'Page', 'a-page');
        $artist = $this->artist('Rəssam', 'Adı');
        $article = Article::factory()->create(['status' => 'published', 'is_active' => true, 'published_at' => now()->subDay()]);
        $article->translations()->create(['locale' => 'az', 'slug' => 'xeber', 'title' => 'Xəbər', 'short_text' => 's', 'content' => 'c']);

        $sitemap = fn () => $this->get('/sitemap.xml')->assertOk()->getContent();
        $before = $sitemap();
        foreach ([$artwork->inventory_code, 'a-page', "a-{$artist->id}", 'xeber'] as $needle) {
            $this->assertStringContainsString($needle, $before, "[{$needle}] should be listed first");
        }
        // A second request is served from the cache and is identical.
        $this->assertSame($before, $sitemap());

        $this->asAdmin()->putJson("/admin/artworks/{$artwork->id}", ['is_active' => false])->assertOk();
        $this->assertStringNotContainsString($artwork->inventory_code, $sitemap());

        $this->asAdmin()->putJson("/admin/pages/{$page->id}", ['is_active' => false])->assertOk();
        $this->assertStringNotContainsString('a-page', $sitemap());

        $this->asAdmin()->putJson("/admin/articles/{$article->id}", ['is_active' => false])->assertOk();
        $this->assertStringNotContainsString('xeber', $sitemap());

        $this->asAdmin()->deleteJson("/admin/artists/{$artist->id}")->assertOk();
        $this->assertStringNotContainsString("a-{$artist->id}", $sitemap());
    }

    // -- What bumps, and what does not ---------------------------------------

    public function test_a_successful_admin_write_bumps_the_version_exactly_once_per_request(): void
    {
        $before = $this->version();

        $this->asAdmin()->putJson('/admin/settings', ['brand_text' => 'Changed'])->assertOk();

        $this->assertNotSame($before, $this->version());
    }

    public function test_reads_failures_and_login_never_bump_the_version(): void
    {
        $artwork = $this->artwork('Əsər', 'Work');
        $editor = User::factory()->create();
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));
        $this->api('/api/v1/homepage');
        $version = $this->version();

        // Public and admin reads.
        $this->getJson('/api/v1/artworks')->assertOk();
        $this->asAdmin()->getJson('/admin/artworks')->assertOk();
        $this->asAdmin()->getJson('/admin/settings')->assertOk();
        // Public write (an enquiry is not content).
        $this->postJson('/api/v1/enquiries', [])->assertStatus(422);
        // Failed admin writes: validation (422), missing record (404), forbidden (403).
        $this->asAdmin()->putJson("/admin/artworks/{$artwork->id}", ['year_created' => 'not-a-year'])->assertStatus(422);
        $this->asAdmin()->putJson('/admin/artworks/999999', ['is_active' => false])->assertStatus(404);
        $this->actingAs($editor)->postJson('/admin/users', [])->assertStatus(403);
        // Login attempts.
        $this->postJson('/admin/login', ['username' => 'cache.admin', 'password' => 'wrong'])->assertStatus(422);

        $this->assertSame($version, $this->version());
    }

    public function test_the_middleware_bumps_for_a_committed_or_possibly_half_committed_write_and_for_nothing_else(): void
    {
        $middleware = new BumpPublicContentVersion(app(PublicContentCache::class));
        $write = fn (string $method = 'POST') => Request::create('/admin/anything', $method);
        $bumps = function (Request $request, callable $next) use ($middleware): bool {
            $before = $this->version();
            try {
                $middleware->handle($request, $next);
            } catch (RuntimeException) {
                // rethrown below where it matters
            }

            return $this->version() !== $before;
        };

        // 2xx: committed. 5xx: may have committed part of it before failing.
        foreach ([200, 201, 204, 500, 503] as $status) {
            $this->assertTrue($bumps($write('PUT'), fn () => response('', $status)), "a {$status} write");
        }
        // 4xx (validation, authorisation, refused delete) is rejected before anything is written.
        foreach ([401, 403, 404, 409, 422, 429] as $status) {
            $this->assertFalse($bumps($write('PUT'), fn () => response('', $status)), "a {$status} write");
        }
        // Reads never bump, whatever they return.
        foreach (['GET', 'HEAD', 'OPTIONS'] as $method) {
            $this->assertFalse($bumps($write($method), fn () => response('', 200)), "{$method}");
        }
    }

    public function test_an_exception_thrown_by_a_write_bumps_the_version_and_still_propagates(): void
    {
        $middleware = new BumpPublicContentVersion(app(PublicContentCache::class));
        $before = $this->version();

        try {
            $middleware->handle(Request::create('/admin/anything', 'POST'), function () {
                throw new RuntimeException('failed after the transaction committed');
            });
            $this->fail('the exception must propagate');
        } catch (RuntimeException $e) {
            $this->assertSame('failed after the transaction committed', $e->getMessage());
        }
        $this->assertNotSame($before, $this->version());

        // ... but an exception from a read changes nothing.
        $before = $this->version();
        try {
            $middleware->handle(Request::create('/admin/anything', 'GET'), fn () => throw new RuntimeException('read failed'));
        } catch (RuntimeException) {
        }
        $this->assertSame($before, $this->version());
    }

    // -- A cache outage must not take the site down --------------------------

    private function breakTheCache(): void
    {
        Log::spy();
        $factory = Mockery::mock(CacheFactory::class);
        $factory->shouldReceive('store')->andThrow(new RuntimeException('cache down'));
        $this->app->instance(PublicContentCache::class, new PublicContentCache($factory));
    }

    public function test_public_reads_still_work_from_the_database_when_the_cache_is_down(): void
    {
        $this->breakTheCache();
        $this->homePage();
        $artwork = $this->artwork('Əsər', 'Work');
        $this->asAdmin()->putJson('/admin/settings', ['brand_text' => 'Outage brand'])->assertOk();

        $this->assertSame([$artwork->inventory_code], $this->wallCodes());
        $this->assertSame('Outage brand', $this->api('/api/v1/site-settings')['data']['brand_text']);
        $this->api('/api/v1/navigation');
        $this->assertStringContainsString($artwork->inventory_code, $this->get('/sitemap.xml')->assertOk()->getContent());
        $this->get('/')->assertOk(); // the SPA shell, which also reads the cached settings, survives too
        Log::shouldHaveReceived('log')->atLeast()->once();
    }

    public function test_an_admin_save_that_committed_is_not_turned_into_a_500_by_a_cache_outage(): void
    {
        $this->breakTheCache();
        $artwork = $this->artwork('Əsər', 'Work');

        $this->asAdmin()->putJson("/admin/artworks/{$artwork->id}", ['is_active' => false])->assertOk();
        $this->asAdmin()->putJson('/admin/settings', ['phone' => '0123'])->assertOk()->assertJsonPath('data.phone', '0123');

        $this->assertFalse($artwork->fresh()->is_active);
        Log::shouldHaveReceived('log')->with('error', Mockery::type('string'), Mockery::type('array'))->atLeast()->once();
    }

    public function test_an_enquiry_is_saved_and_notified_when_the_cache_is_down(): void
    {
        $this->breakTheCache();
        Mail::fake();
        config(['gallery.enquiry_notification_email' => 'gallery@example.org']);

        $this->postJson('/api/v1/enquiries', ['name' => 'Aygün', 'email' => 'a@example.org', 'subject' => 'general_contact', 'message' => 'Salam'])
            ->assertStatus(201);

        $this->assertDatabaseHas('enquiries', ['email' => 'a@example.org']);
        Mail::assertSent(NewEnquiryReceived::class);
    }

    public function test_every_mutating_admin_route_is_covered_by_the_invalidation_middleware(): void
    {
        app(HttpKernel::class); // registers the middleware groups on the router
        $router = app('router');
        $covered = [];
        $exempt = ['admin/login', 'admin/logout'];

        foreach (Route::getRoutes() as $route) {
            $writes = array_intersect($route->methods(), ['POST', 'PUT', 'PATCH', 'DELETE']);

            if (! str_starts_with($route->uri(), 'admin/') || $writes === []) {
                continue;
            }

            $middleware = $router->resolveMiddleware($route->gatherMiddleware(), $route->excludedMiddleware());
            $has = in_array(BumpPublicContentVersion::class, $middleware, true);
            $label = implode('|', $writes).' '.$route->uri();

            if (in_array($route->uri(), $exempt, true)) {
                $this->assertFalse($has, "{$label} changes no content and must not bump");

                continue;
            }

            $this->assertTrue($has, "{$label} is an admin write and must invalidate the public cache");
            $covered[] = $label;
        }

        // Guards against the walk passing vacuously if the route table ever changes shape.
        $this->assertGreaterThanOrEqual(30, count($covered));
        $this->assertContains('PUT admin/settings', $covered);
        $this->assertContains('POST admin/media', $covered);
        $this->assertContains('DELETE admin/artworks/{artwork}', $covered);
    }

    #[DataProvider('mutatingRoutesThatAreNotTheContentCrud')]
    public function test_representative_admin_writes_of_every_kind_bump_the_version(string $method, string $uri, array $payload): void
    {
        $page = $this->navPage('A', 'B', 'walk-'.uniqid());
        $artwork = $this->artwork('Əsər', 'Work');
        $uri = str_replace(['{page}', '{artwork}'], [$page->id, $artwork->id], $uri);
        $before = $this->version();

        $response = $this->asAdmin()->json($method, $uri, $payload);

        $this->assertTrue($response->isSuccessful(), "{$method} {$uri} answered {$response->getStatusCode()}");
        $this->assertNotSame($before, $this->version(), "{$method} {$uri}");
    }

    /** @return array<string, array{0: string, 1: string, 2: array}> reorder and nested-resource routes, which have their own controllers */
    public static function mutatingRoutesThatAreNotTheContentCrud(): array
    {
        return [
            'artwork update' => ['PUT', '/admin/artworks/{artwork}', ['is_active' => true]],
            'artwork delete' => ['DELETE', '/admin/artworks/{artwork}', []],
            'page update' => ['PUT', '/admin/pages/{page}', ['is_active' => true]],
            'page section create' => ['POST', '/admin/pages/{page}/sections', ['key' => 'hero', 'is_active' => true, 'translations' => [['locale' => 'az', 'heading' => 'H', 'body' => 'B']]]],
            'settings update' => ['PUT', '/admin/settings', ['phone' => '123']],
        ];
    }

    // -- Out-of-band changes -------------------------------------------------

    public function test_a_change_made_outside_the_admin_appears_after_the_ttl_or_after_a_flush(): void
    {
        $this->homePage();
        $artwork = $this->artwork('Əsər', 'Work');
        $this->assertSame([$artwork->inventory_code], $this->wallCodes());

        // Seeder / tinker / SQL: nothing bumps the version, so the cached homepage still shows it ...
        $artwork->update(['is_active' => false]);
        $this->assertSame([$artwork->inventory_code], $this->wallCodes());

        // ... until the flush command, which is immediate ...
        $this->artisan('public-cache:flush')->assertSuccessful();
        $this->assertSame([], $this->wallCodes());
    }

    public function test_the_homepage_ttl_bounds_staleness_when_nothing_bumps_the_version(): void
    {
        $this->homePage();
        $artwork = $this->artwork('Əsər', 'Work');
        $this->wallCodes();
        $artwork->update(['is_active' => false]);

        $this->travel(59)->seconds();
        $this->assertSame([$artwork->inventory_code], $this->wallCodes(), 'inside the 60 s TTL');

        $this->travel(2)->seconds();
        $this->assertSame([], $this->wallCodes(), 'past the 60 s TTL the homepage is rebuilt');
    }

    public function test_settings_and_navigation_ttl_is_five_minutes_and_the_sitemap_ten(): void
    {
        $this->assertSame(300, config('public_cache.ttl.site_settings'));
        $this->assertSame(300, config('public_cache.ttl.navigation'));
        $this->assertSame(60, config('public_cache.ttl.homepage'));
        $this->assertSame(600, config('public_cache.ttl.sitemap'));

        SocialLink::factory()->create(['platform' => 'instagram']);
        $this->asAdmin()->putJson('/admin/settings', ['brand_text' => 'Cached brand'])->assertOk();
        $this->api('/api/v1/site-settings');
        SiteSetting::query()->where('key', 'brand_text')->update(['value' => 'Changed behind the cache']);

        $this->travel(299)->seconds();
        $this->assertSame('Cached brand', $this->api('/api/v1/site-settings')['data']['brand_text']);
        $this->travel(2)->seconds();
        $this->assertSame('Changed behind the cache', $this->api('/api/v1/site-settings')['data']['brand_text']);
    }

    public function test_the_flush_command_bumps_the_version(): void
    {
        $before = $this->version();

        $exit = Artisan::call('public-cache:flush');

        $this->assertSame(0, $exit);
        $this->assertNotSame($before, $this->version());
        $this->assertStringContainsString('invalidated', Artisan::output());
    }

    // -- Query impact --------------------------------------------------------

    public function test_a_warm_request_runs_no_queries_for_the_cached_payloads_and_a_cold_one_does(): void
    {
        (new BenchmarkSeeder)->populate(3);
        $this->navPage('Haqqımızda', 'About', 'about-us');

        foreach (['/api/v1/site-settings', '/api/v1/navigation', '/api/v1/homepage', '/api/v1/homepage?locale=en', '/sitemap.xml'] as $url) {
            $cold = $this->countQueries(fn () => $this->get($url)->assertOk());
            $warm = $this->countQueries(fn () => $this->get($url)->assertOk());

            $this->assertGreaterThan(0, $cold, "{$url} cold");
            $this->assertSame(0, $warm, "{$url} warm");
        }
    }

    public function test_on_the_database_cache_store_a_warm_request_costs_at_most_a_version_read_and_a_payload_read(): void
    {
        config(['cache.default' => 'database']);
        (new BenchmarkSeeder)->populate(3);
        $this->api('/api/v1/homepage');

        $queries = $this->captureQueries(fn () => $this->get('/api/v1/homepage')->assertOk());

        $this->assertLessThanOrEqual(2, count($queries), implode("\n", $queries));
        $this->assertNotEmpty($queries);
        foreach ($queries as $sql) {
            $this->assertMatchesRegularExpression('/from ["`]cache["`]/i', $sql, 'a warm homepage must touch only the cache table');
        }
    }

    public function test_invalidation_also_works_on_the_database_cache_store(): void
    {
        config(['cache.default' => 'database']);
        $this->homePage();
        $artwork = $this->artwork('Əsər', 'Work');

        $this->assertSame([$artwork->inventory_code], $this->wallCodes());
        $this->assertSame(0, $this->countQueries(fn () => $this->api('/api/v1/social-links')) - $this->countQueries(fn () => $this->api('/api/v1/social-links')), 'sanity: uncached endpoint');

        $this->asAdmin()->putJson("/admin/artworks/{$artwork->id}", ['is_active' => false])->assertOk();

        $this->assertSame([], $this->wallCodes());
    }

    // -- What is stored ------------------------------------------------------

    public function test_cached_payloads_are_plain_strings_never_models_or_resources(): void
    {
        $this->homePage();
        $this->artwork('Əsər', 'Work');
        $this->asAdmin()->putJson('/admin/settings', ['brand_text' => 'B'])->assertOk();

        $body = $this->getJson('/api/v1/homepage')->getContent();
        $this->getJson('/api/v1/navigation');
        $this->getJson('/api/v1/site-settings');
        $this->get('/sitemap.xml');

        $entry = fn (string $key) => Cache::get('public-content:entry:'.$key);
        $this->assertSame($this->version(), $entry('homepage:az')['version'], 'every entry is stamped with the current version');
        $this->assertSame($body, $entry('homepage:az')['value'], 'the stored homepage is the exact JSON that is served');
        $this->assertIsString($entry('navigation:az')['value']);
        $this->assertIsString($entry('sitemap')['value']);
        $this->assertSame('B', $entry('site-settings')['value']['brand_text']);
        $this->assertSame([], array_filter($entry('site-settings')['value'], fn ($v) => is_object($v)), 'scalars only');
    }

    public function test_repeated_admin_edits_never_grow_the_cache_table(): void
    {
        // The database store never deletes an expired row that is not read again and this project runs no scheduler,
        // so entries must be overwritten in place: the row count is bounded by the payload names, not by the edits.
        config(['cache.default' => 'database']);
        $this->homePage();
        $this->artwork('Əsər', 'Work');
        $rows = fn () => DB::table('cache')->where('key', 'like', '%public-content:%')->count();

        $warm = function () {
            foreach (['/api/v1/homepage', '/api/v1/homepage?locale=en', '/api/v1/navigation', '/api/v1/site-settings'] as $url) {
                $this->getJson($url)->assertOk();
            }
            $this->get('/sitemap.xml')->assertOk();
        };

        $warm();
        $steady = $rows();
        $this->assertLessThanOrEqual(7, $steady, 'six payloads plus the version');

        foreach (range(1, 15) as $i) {
            $this->asAdmin()->putJson('/admin/settings', ['brand_text' => "Brand {$i}"])->assertOk();
            $warm();
        }

        $this->assertSame($steady, $rows(), 'fifteen admin edits must not leave a single extra row behind');
        $this->assertSame('Brand 15', $this->api('/api/v1/site-settings')['data']['brand_text']);
    }

    public function test_a_cached_response_is_byte_identical_to_the_uncached_one(): void
    {
        (new BenchmarkSeeder)->populate(3);

        foreach (['/api/v1/homepage', '/api/v1/homepage?locale=en', '/api/v1/navigation', '/api/v1/site-settings'] as $url) {
            $cold = $this->getJson($url)->assertOk();
            $warm = $this->getJson($url)->assertOk();

            $this->assertSame($cold->getContent(), $warm->getContent(), $url);
            $this->assertSame($cold->headers->get('Content-Type'), $warm->headers->get('Content-Type'), $url);
            $this->assertSame($cold->headers->get('ETag'), $warm->headers->get('ETag'), $url);
        }
    }
}
