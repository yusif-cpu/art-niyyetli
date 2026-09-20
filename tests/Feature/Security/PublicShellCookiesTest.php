<?php

namespace Tests\Feature\Security;

use App\Enums\PageType;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Phase 12 Task 6 (P-01): anonymous public HTML — the SPA shell, robots.txt and sitemap.xml —
 * starts no session, writes no `sessions` row and sets no cookie, so it can be cached by a browser
 * or a shared cache. The admin shell and the admin API keep the full session stack.
 *
 * The session driver is switched to `database` (phpunit.xml uses `array`) so a stray session
 * would show up as a row, the way it does on the running app.
 */
class PublicShellCookiesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['session.driver' => 'database']);
    }

    /** @return array<string, array{0: string, 1: int}> */
    public static function publicHtmlUrls(): array
    {
        return [
            'home' => ['/', 200],
            'home with locale' => ['/?locale=en', 200],
            'static page' => ['/collectors', 200],
            'artwork detail' => ['/artworks/AN-COOKIE-1', 200],
            'unknown path' => ['/no-such-page', 404],
            'unknown nested path' => ['/this/does/not/exist', 404],
            'missing artwork' => ['/artworks/does-not-exist', 404],
            'sitemap' => ['/sitemap.xml', 200],
            'robots' => ['/robots.txt', 200],
        ];
    }

    #[DataProvider('publicHtmlUrls')]
    public function test_public_html_sets_no_cookie_and_creates_no_session_row(string $url, int $status): void
    {
        $this->seedArtwork();
        $this->seedStaticPage('Collectors');
        Page::create(['type' => PageType::Home, 'is_active' => true])
            ->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'x', 'content' => 'x']);

        $response = $this->get($url)->assertStatus($status);

        $this->assertSame([], $response->headers->getCookies(), 'A public response must not set any cookie.');
        $this->assertFalse($response->headers->has('Set-Cookie'));
        $this->assertSame(0, DB::table('sessions')->count());
    }

    public function test_twenty_public_requests_leave_the_sessions_table_untouched(): void
    {
        $this->seedArtwork();
        $this->seedStaticPage('Collectors');

        foreach (range(1, 10) as $i) {
            $this->get('/collectors')->assertOk();
            $this->get('/no-such-page')->assertNotFound();
        }

        $this->assertSame(0, DB::table('sessions')->count());
    }

    public function test_a_stale_session_cookie_from_the_browser_is_neither_read_nor_reissued(): void
    {
        $response = $this->withUnencryptedCookie(config('session.cookie'), 'stale-value')->get('/');

        $response->assertOk();
        $this->assertSame([], $response->headers->getCookies());
        $this->assertSame(0, DB::table('sessions')->count());
    }

    public function test_public_shell_is_revalidatable_and_user_agnostic(): void
    {
        $this->seedStaticPage('Collectors');

        $response = $this->get('/collectors')->assertOk();

        $directives = array_map('trim', explode(',', (string) $response->headers->get('Cache-Control')));
        $this->assertContains('public', $directives);
        $this->assertContains('max-age=0', $directives);
        $this->assertContains('must-revalidate', $directives);
        $this->assertNotContains('private', $directives);
        $this->assertNotContains('no-store', $directives);
        $this->assertMatchesRegularExpression('/^W\/"[0-9a-f]{32}"$/', (string) $response->headers->get('ETag'));
    }

    public function test_matching_etag_returns_304_with_no_body(): void
    {
        $this->seedStaticPage('Collectors');
        $etag = $this->get('/collectors')->assertOk()->headers->get('ETag');

        $revalidated = $this->withHeader('If-None-Match', $etag)->get('/collectors');

        $revalidated->assertStatus(304);
        $this->assertSame('', $revalidated->getContent());
        $this->assertSame($etag, $revalidated->headers->get('ETag'));
        $this->assertSame([], $revalidated->headers->getCookies());
    }

    public function test_etag_changes_when_the_rendered_metadata_changes(): void
    {
        $page = $this->seedStaticPage('Old title');
        $before = $this->get('/collectors')->assertOk()->headers->get('ETag');

        $page->translations()->where('locale', 'az')->update(['title' => 'New title']);

        $stale = $this->withHeader('If-None-Match', $before)->get('/collectors');

        $stale->assertOk();
        $stale->assertSee('New title', false);
        $this->assertNotSame($before, $stale->headers->get('ETag'));
    }

    public function test_etag_differs_per_locale(): void
    {
        $page = $this->seedStaticPage('Kolleksiyaçılar');
        $page->translations()->create(['locale' => 'en', 'slug' => 'collectors', 'title' => 'Collectors', 'content' => 'x']);

        $az = $this->get('/collectors')->assertOk()->headers->get('ETag');
        $en = $this->get('/collectors?locale=en')->assertOk()->headers->get('ETag');

        $this->assertNotSame($az, $en);
    }

    public function test_a_404_shell_keeps_its_status_metadata_and_cache_headers(): void
    {
        $response = $this->get('/no-such-page');

        $response->assertStatus(404);
        $response->assertSee('<meta name="robots" content="noindex, follow">', false);
        $response->assertSee('id="public-root"', false);
        $this->assertStringContainsString('must-revalidate', (string) $response->headers->get('Cache-Control'));
        $this->assertNotNull($response->headers->get('ETag'));
    }

    public function test_seo_metadata_is_still_rendered_server_side(): void
    {
        $this->seedArtwork();

        $this->get('/artworks/AN-COOKIE-1')
            ->assertOk()
            ->assertSee('<title>Sunset Over Baku — ArtNiyyətli</title>', false)
            ->assertSee('<link rel="canonical" href="http://localhost:8080/artworks/AN-COOKIE-1">', false);
    }

    public function test_admin_shell_still_starts_a_session_and_sets_the_xsrf_cookie(): void
    {
        $response = $this->get('/admin')->assertOk();

        $names = array_map(fn ($cookie) => $cookie->getName(), $response->headers->getCookies());
        $this->assertContains('XSRF-TOKEN', $names);
        $this->assertContains(config('session.cookie'), $names);
        $this->assertSame(1, DB::table('sessions')->count());
    }

    public function test_admin_login_still_issues_an_authenticated_session(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class); // same harness allowance as AdminAuthTest

        $user = User::factory()->create(['username' => 'cookie.admin', 'password' => 'correct-password']);
        $user->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $response = $this->postJson('/admin/login', ['username' => 'cookie.admin', 'password' => 'correct-password'])->assertOk();

        $names = array_map(fn ($cookie) => $cookie->getName(), $response->headers->getCookies());
        $this->assertContains(config('session.cookie'), $names);
        $this->assertAuthenticatedAs($user);
        $this->assertSame(1, DB::table('sessions')->count());
    }

    public function test_only_the_public_html_routes_drop_the_session_stack(): void
    {
        app(HttpKernel::class); // resolving the HTTP kernel is what registers the middleware groups on the router
        $router = app('router');
        $sessionless = [];

        foreach (Route::getRoutes() as $route) {
            $middleware = $router->resolveMiddleware($route->gatherMiddleware(), $route->excludedMiddleware());
            $usesSession = in_array(StartSession::class, $middleware, true);

            if (str_starts_with($route->uri(), 'admin')) {
                $this->assertTrue($usesSession, "Admin route [{$route->uri()}] must keep the session stack.");
            }

            if (! $usesSession && ! str_starts_with($route->uri(), 'api/')) {
                $sessionless[] = $route->uri();
            }
        }

        // `up` (health) and `storage/{path}` (local-disk file serving, present when a test has faked a disk)
        // are framework routes that never had the web group. Any other route added without a session must
        // be a deliberate, reviewed change to this list.
        $this->assertEqualsCanonicalizing(
            ['/', 'robots.txt', 'sitemap.xml', '{any}'],
            array_values(array_diff($sessionless, ['up', 'storage/{path}'])),
        );
    }

    private function seedStaticPage(string $title): Page
    {
        $page = Page::create(['type' => PageType::Collectors, 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'collectors', 'title' => $title, 'content' => 'x']);

        return $page;
    }

    private function seedArtwork(): void
    {
        $artwork = Artwork::create([
            'artist_id' => Artist::create([])->id,
            'medium_id' => Medium::create(['slug' => 'oil'])->id,
            'genre_id' => Genre::create(['slug' => 'painting'])->id,
            'year_created' => 2023, 'width_cm' => 80, 'height_cm' => 100,
            'price' => 5000, 'inventory_code' => 'AN-COOKIE-1', 'is_active' => true,
        ]);
        $artwork->translations()->create(['locale' => 'az', 'slug' => 'x', 'title' => 'Sunset Over Baku', 'short_description' => 'An oil painting.', 'provenance' => 'Acquired directly from the artist.']);
        $artwork->artist->translations()->create(['locale' => 'az', 'slug' => 'a', 'first_name' => 'Aygün', 'last_name' => 'Məmmədova']);
    }
}
