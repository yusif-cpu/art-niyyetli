<?php

namespace Tests\Feature\Api;

use App\Http\Middleware\PublicApiCacheHeaders;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BenchmarkSeeder;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Phase 12 Task 9: HTTP cache validators on the public read-only API — Cache-Control, a strong ETag and 304s — and
 * proof that nothing else (writes, errors, admin responses, cookies) is ever marked cacheable.
 */
class ApiCacheHeadersTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<string, string> */
    private array $handles;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottleRequests::class);
        $this->handles = (new BenchmarkSeeder)->populate(3);
    }

    /** @return array<int, string> every public read endpoint, with data behind each one */
    private function publicReadUrls(): array
    {
        $h = $this->handles;

        return [
            '/api/v1/homepage', '/api/v1/homepage?locale=en', '/api/v1/navigation', '/api/v1/site-settings', '/api/v1/social-links',
            '/api/v1/faqs', '/api/v1/pages', "/api/v1/pages/{$h['page_slug']}", '/api/v1/artworks', '/api/v1/artworks?page=2&per_page=2',
            '/api/v1/artworks?sort=price_asc&genre=bench-genre-0', "/api/v1/artworks/{$h['artwork_code']}", '/api/v1/artists',
            "/api/v1/artists/{$h['artist_slug']}", '/api/v1/exhibitions', "/api/v1/exhibitions/{$h['exhibition_slug']}",
            '/api/v1/articles', "/api/v1/articles/{$h['article_slug']}", '/api/v1/enquiry-subjects',
        ];
    }

    /** @return array<int, string> the Vary header, split into lower-case tokens */
    private function varyTokens(TestResponse $response): array
    {
        return array_values(array_filter(array_map(
            fn (string $token) => strtolower(trim($token)),
            explode(',', implode(',', $response->headers->all('Vary')))
        )));
    }

    /** @return array<int, string> */
    private function directives(TestResponse $response): array
    {
        return array_map('trim', explode(',', (string) $response->headers->get('Cache-Control')));
    }

    public function test_every_public_read_carries_cache_control_and_a_strong_etag(): void
    {
        foreach ($this->publicReadUrls() as $url) {
            $response = $this->getJson($url)->assertOk();

            $this->assertContains('public', $this->directives($response), $url);
            $this->assertContains('max-age=60', $this->directives($response), $url);
            $this->assertNotContains('private', $this->directives($response), $url);
            $this->assertNotContains('no-store', $this->directives($response), $url);
            $this->assertMatchesRegularExpression('/^"[0-9a-f]{32}"$/', (string) $response->headers->get('ETag'), "{$url}: a strong (not W/) ETag");
            $this->assertContains('accept-encoding', $this->varyTokens($response), $url);
            $this->assertFalse($response->headers->has('Set-Cookie'), "{$url}: a public response must not set cookies");
            $this->assertNotContains('cookie', $this->varyTokens($response), $url);
            $this->assertNotContains('stale-while-revalidate', array_map(fn ($d) => explode('=', $d)[0], $this->directives($response)), 'opt-in only');
        }
    }

    public function test_the_etag_is_the_hash_of_the_body_and_stable_for_identical_content(): void
    {
        $first = $this->getJson('/api/v1/artworks');
        $second = $this->getJson('/api/v1/artworks');

        $this->assertSame('"'.md5($first->getContent()).'"', $first->headers->get('ETag'));
        $this->assertSame($first->headers->get('ETag'), $second->headers->get('ETag'));
    }

    public function test_the_etag_differs_whenever_the_response_body_differs(): void
    {
        $etag = fn (string $url) => $this->getJson($url)->assertOk()->headers->get('ETag');

        $etags = [
            $etag('/api/v1/homepage'), $etag('/api/v1/homepage?locale=en'),
            $etag('/api/v1/artworks'), $etag('/api/v1/artworks?locale=en'), $etag('/api/v1/artworks?page=2&per_page=2'),
            $etag('/api/v1/artworks?sort=price_asc'), $etag('/api/v1/artworks?sort=price_desc'),
            $etag('/api/v1/artworks?genre=bench-genre-0'), $etag('/api/v1/artworks?genre=bench-genre-1'),
        ];

        $this->assertCount(count($etags), array_unique($etags), 'two different responses must never share a validator');
    }

    public function test_a_matching_if_none_match_gets_a_bodyless_304_that_keeps_the_validators(): void
    {
        foreach ($this->publicReadUrls() as $url) {
            $etag = $this->getJson($url)->headers->get('ETag');

            $response = $this->withHeader('If-None-Match', $etag)->getJson($url);

            $response->assertStatus(304);
            $this->assertSame('', $response->getContent(), $url);
            $this->assertSame($etag, $response->headers->get('ETag'), $url);
            $this->assertContains('max-age=60', $this->directives($response), $url);
        }
    }

    public function test_a_stale_or_foreign_if_none_match_gets_the_full_response(): void
    {
        $response = $this->withHeader('If-None-Match', '"00000000000000000000000000000000"')->getJson('/api/v1/artworks');

        $response->assertOk();
        $this->assertNotSame('', $response->getContent());

        // The validator of another URL never matches.
        $other = $this->getJson('/api/v1/artists')->headers->get('ETag');
        $this->withHeader('If-None-Match', $other)->getJson('/api/v1/artworks')->assertOk();
    }

    public function test_a_head_request_gets_the_headers(): void
    {
        $response = $this->call('HEAD', '/api/v1/faqs');

        $response->assertOk();
        $this->assertContains('max-age=60', array_map('trim', explode(',', (string) $response->headers->get('Cache-Control'))));
        $this->assertNotNull($response->headers->get('ETag'));
    }

    public function test_the_enquiry_post_is_never_cacheable(): void
    {
        foreach ([['payload' => [], 'status' => 422], ['payload' => ['website' => 'bot', 'name' => 'x', 'email' => 'x@example.com', 'subject' => 'general_contact', 'message' => 'm'], 'status' => 201]] as $case) {
            $response = $this->postJson('/api/v1/enquiries', $case['payload'])->assertStatus($case['status']);

            $this->assertNotContains('public', $this->directives($response));
            $this->assertNotContains('max-age=60', $this->directives($response));
            $this->assertNull($response->headers->get('ETag'));
        }
    }

    public function test_errors_and_validation_failures_are_never_cacheable(): void
    {
        foreach ([
            ['/api/v1/artworks/does-not-exist', 404],
            ['/api/v1/pages/does-not-exist', 404],
            ['/api/v1/artworks?artist=abc', 422],
            ['/api/v1/does-not-exist', 404],
        ] as [$url, $status]) {
            $response = $this->getJson($url)->assertStatus($status);

            $this->assertNotContains('public', $this->directives($response), $url);
            $this->assertNull($response->headers->get('ETag'), $url);
        }

        $this->postJson('/api/v1/faqs', [])->assertStatus(405);
    }

    public function test_admin_responses_are_never_cacheable(): void
    {
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));

        foreach (['/admin/dashboard', '/admin/artworks', '/admin/settings', '/admin/faqs'] as $url) {
            $response = $this->actingAs($admin)->getJson($url)->assertOk();

            $this->assertNotContains('public', $this->directives($response), $url);
            $this->assertNull($response->headers->get('ETag'), $url);
        }

    }

    public function test_an_anonymous_admin_request_is_rejected_without_cache_headers(): void
    {
        $response = $this->getJson('/admin/artworks')->assertStatus(401);

        $this->assertNotContains('public', $this->directives($response));
        $this->assertNull($response->headers->get('ETag'));
    }

    public function test_the_admin_shell_and_public_html_are_untouched(): void
    {
        $this->assertNotContains('max-age=60', $this->directives($this->get('/admin')));
        $this->assertContains('must-revalidate', $this->directives($this->get('/')), 'the SPA shell keeps its own validators from Task 6');
        $this->assertNotContains('max-age=60', $this->directives($this->get('/')));
    }

    public function test_only_public_get_routes_use_the_cache_headers_middleware(): void
    {
        app(Kernel::class); // registers the middleware groups on the router
        $router = app('router');

        foreach (Route::getRoutes() as $route) {
            $middleware = $router->resolveMiddleware($route->gatherMiddleware(), $route->excludedMiddleware());
            $has = in_array(PublicApiCacheHeaders::class, $middleware, true);
            $isPublicRead = str_starts_with($route->uri(), 'api/v1/') && in_array('GET', $route->methods(), true);

            $this->assertSame($isPublicRead, $has, "route [{$route->methods()[0]} {$route->uri()}]");
        }
    }

    public function test_a_zero_ttl_turns_the_headers_and_the_304_off(): void
    {
        config(['public_cache.api_ttl' => 0]);

        $response = $this->getJson('/api/v1/artworks')->assertOk();

        $this->assertNotContains('public', $this->directives($response));
        $this->assertNull($response->headers->get('ETag'));

        // ... and an If-None-Match is not honoured, so a client can never be told "not modified" while it is off.
        $this->withHeader('If-None-Match', '"'.md5($response->getContent()).'"')->getJson('/api/v1/artworks')->assertOk();
    }

    public function test_the_ttl_is_configurable_and_stale_while_revalidate_is_opt_in(): void
    {
        config(['public_cache.api_ttl' => 15, 'public_cache.api_stale_while_revalidate' => 30]);

        $directives = $this->directives($this->getJson('/api/v1/faqs')->assertOk());

        sort($directives); // Symfony orders the directives itself
        $this->assertSame(['max-age=15', 'public', 'stale-while-revalidate=30'], $directives);
    }

    public function test_the_vary_header_keeps_origin_when_cors_adds_it(): void
    {
        // With several allowed origins the CORS layer echoes the caller's origin and so must send Vary: Origin.
        config(['cors.allowed_origins' => ['https://frontend.example.org', 'https://admin-preview.example.org']]);

        $response = $this->withHeader('Origin', 'https://frontend.example.org')->getJson('/api/v1/faqs')->assertOk();

        $vary = $this->varyTokens($response);
        $this->assertContains('accept-encoding', $vary);
        $this->assertContains('origin', $vary, 'a shared cache must keep separate entries per Origin');
        $this->assertNotContains('cookie', $vary);
    }
}
