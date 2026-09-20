<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\Facades\File;
use Tests\Support\CountsQueries;
use Tests\Support\ManipulatesEnvironment;
use Tests\TestCase;

/**
 * Phase 12 Task 7 (P-02 backend half, P-08, S-17): the rate limiter runs on its own cache store
 * (cache.limiter, "file" by default) so throttling costs no SQL, the limits come from
 * config/security.php, and the limits themselves are unchanged: public API 60/min/IP, enquiry
 * 5/hour/IP, admin login 5/min per username+IP and 20/min per IP.
 *
 * phpunit.xml keeps the limiter on `array` for the rest of the suite; the tests below that are
 * about the store switch it to a real `file` store in a private temp directory, while the default
 * cache store is `database` so that any counter work that still reached it would show up as SQL.
 */
class RateLimiterStoreTest extends TestCase
{
    use CountsQueries, ManipulatesEnvironment, RefreshDatabase;

    private string $limiterDirectory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->limiterDirectory = sys_get_temp_dir().'/limiter-'.uniqid();
        config(['cache.default' => 'database']);

        // Only so the harness can POST to /admin without a token exchange (as AdminAuthTest does); CSRF is untouched in the app.
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    protected function tearDown(): void
    {
        $this->restoreEnvironment();
        File::deleteDirectory($this->limiterDirectory);

        parent::tearDown();
    }

    private function useLimiterStore(?string $store): void
    {
        config([
            'cache.limiter' => $store,
            'cache.stores.file.path' => $this->limiterDirectory,
            'cache.stores.file.lock_path' => $this->limiterDirectory,
        ]);

        // The limiter and the cache store instances are built once per application: rebuild them for the new config.
        // The named limiters are registered on the limiter instance at boot, so carry them over to the new one.
        $limiterNames = ['public-api', 'enquiry-submission', 'media-upload', 'admin-api'];
        $definitions = array_map(fn (string $name) => $this->app->make(RateLimiter::class)->limiter($name), $limiterNames);

        $this->app->make('cache')->forgetDriver('file');
        $this->app->make('cache')->forgetDriver('database');
        $this->app->forgetInstance(RateLimiter::class);
        Facade::clearResolvedInstance(RateLimiter::class);

        foreach ($limiterNames as $i => $name) {
            $this->app->make(RateLimiter::class)->for($name, $definitions[$i]);
        }
    }

    /** @return array<int, string> the SQL statements that touched the cache table */
    private function cacheTableQueries(callable $request): array
    {
        return array_values(array_filter(
            $this->captureQueries($request),
            fn (string $sql) => preg_match('/[`"]cache[`"]/', $sql) === 1,
        ));
    }

    private function admin(string $username = 'limit.admin'): User
    {
        $user = User::factory()->create(['username' => $username]);
        $user->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));

        return $user;
    }

    private function postEnquiry(array $server = []): int
    {
        // An empty submission fails validation (422) but still counts against the limit.
        return $this->withServerVariables($server)->postJson('/api/v1/enquiries', [])->getStatusCode();
    }

    // -- Configuration -------------------------------------------------------

    public function test_the_shipped_default_limiter_store_is_file_and_it_is_tunable(): void
    {
        $this->assertSame('file', $this->configFileWith('cache', ['CACHE_LIMITER_STORE' => null])['limiter']);
        $this->assertSame('redis', $this->configFileWith('cache', ['CACHE_LIMITER_STORE' => 'redis'])['limiter']);
        // `CACHE_LIMITER_STORE=` (empty) reaches the framework as "" and would fail every throttled request
        // with "Cache store [] is not defined", so it is treated as unset.
        $this->assertSame('file', $this->configFileWith('cache', ['CACHE_LIMITER_STORE' => ''])['limiter']);
    }

    public function test_the_shipped_limits_are_unchanged_by_default(): void
    {
        $limits = $this->configFileWith('security', ['RATE_LIMIT_PUBLIC_API' => null, 'RATE_LIMIT_ADMIN_API' => null])['rate_limits'];

        $this->assertSame(['public_api' => 60, 'enquiry' => 5, 'media_upload' => 20, 'admin_api' => 240], $limits);
    }

    public function test_the_tunable_limits_take_valid_values_and_ignore_nonsense(): void
    {
        $custom = $this->configFileWith('security', ['RATE_LIMIT_PUBLIC_API' => '90', 'RATE_LIMIT_ADMIN_API' => '100'])['rate_limits'];
        $this->assertSame([90, 100], [$custom['public_api'], $custom['admin_api']]);

        foreach (['', '0', '-5', 'abc'] as $bad) {
            $limits = $this->configFileWith('security', ['RATE_LIMIT_PUBLIC_API' => $bad, 'RATE_LIMIT_ADMIN_API' => $bad])['rate_limits'];
            $this->assertSame([60, 240], [$limits['public_api'], $limits['admin_api']], "value [{$bad}] must fall back to the default");
        }
    }

    public function test_the_enquiry_limit_is_not_an_environment_setting(): void
    {
        $limits = $this->configFileWith('security', ['RATE_LIMIT_ENQUIRY' => '500'])['rate_limits'];

        $this->assertSame(5, $limits['enquiry']);
    }

    // -- The store: zero SQL -------------------------------------------------

    public function test_throttled_requests_run_no_sql_against_the_cache_table_on_the_file_store(): void
    {
        $this->useLimiterStore('file');
        $this->admin();

        $this->getJson('/api/v1/faqs')->assertOk(); // warm-up

        $this->assertSame([], $this->cacheTableQueries(fn () => $this->getJson('/api/v1/faqs')->assertOk()), 'public API');
        $this->assertSame([], $this->cacheTableQueries(fn () => $this->postJson('/api/v1/enquiries', [])->assertStatus(422)), 'enquiry (public-api + enquiry-submission)');
        $this->assertSame([], $this->cacheTableQueries(fn () => $this->postJson('/admin/login', ['username' => 'nobody', 'password' => 'wrong'])->assertStatus(422)), 'failed admin login');
        $this->assertSame([], $this->cacheTableQueries(fn () => $this->actingAs($this->admin('second.admin'))->postJson('/admin/faqs/reorder', [])), 'admin write');
    }

    public function test_the_same_requests_do_hit_the_cache_table_when_the_limiter_is_on_the_database_store(): void
    {
        // Control for the test above: proves the counter really detects limiter SQL, so the zero is meaningful.
        $this->useLimiterStore('database');

        $this->getJson('/api/v1/faqs')->assertOk();

        $this->assertNotEmpty($this->cacheTableQueries(fn () => $this->getJson('/api/v1/faqs')->assertOk()));
    }

    public function test_counters_are_kept_as_files_in_the_limiter_directory(): void
    {
        $this->useLimiterStore('file');

        $this->getJson('/api/v1/faqs')->assertOk();

        $this->assertNotEmpty(File::allFiles($this->limiterDirectory));
    }

    public function test_an_unset_limiter_store_falls_back_to_the_default_store(): void
    {
        $this->useLimiterStore(null);

        $this->getJson('/api/v1/faqs')->assertOk();

        // The counters went to cache.default, which is the database here.
        $this->assertNotEmpty($this->cacheTableQueries(fn () => $this->getJson('/api/v1/faqs')->assertOk()));
    }

    // -- Public API: 60/min, headers, buckets --------------------------------

    public function test_the_public_api_allows_sixty_per_minute_then_answers_429_with_the_standard_headers(): void
    {
        $this->useLimiterStore('file');

        foreach (range(1, 60) as $n) {
            $response = $this->getJson('/api/v1/faqs')->assertOk();
            $this->assertSame('60', $response->headers->get('X-RateLimit-Limit'));
            $this->assertSame((string) (60 - $n), $response->headers->get('X-RateLimit-Remaining'));
        }

        $limited = $this->getJson('/api/v1/faqs')->assertStatus(429);

        $this->assertSame('60', $limited->headers->get('X-RateLimit-Limit'));
        $this->assertSame('0', $limited->headers->get('X-RateLimit-Remaining'));
        $retryAfter = (int) $limited->headers->get('Retry-After');
        $this->assertGreaterThanOrEqual(1, $retryAfter);
        $this->assertLessThanOrEqual(60, $retryAfter);
        $this->assertNotNull($limited->headers->get('X-RateLimit-Reset'));
    }

    public function test_the_public_api_limit_follows_the_configured_value(): void
    {
        $this->useLimiterStore('file');
        config(['security.rate_limits.public_api' => 3]);

        $statuses = array_map(fn () => $this->getJson('/api/v1/faqs')->getStatusCode(), range(1, 4));

        $this->assertSame([200, 200, 200, 429], $statuses);
    }

    public function test_each_client_ip_has_its_own_bucket(): void
    {
        $this->useLimiterStore('file');
        config(['security.rate_limits.public_api' => 2]);

        $first = fn () => $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])->getJson('/api/v1/faqs')->getStatusCode();
        $second = fn () => $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.11'])->getJson('/api/v1/faqs')->getStatusCode();

        $this->assertSame([200, 200, 429], [$first(), $first(), $first()]);
        $this->assertSame([200, 200], [$second(), $second()], 'a different IP must be unaffected');
    }

    // -- Enquiry: 5/hour -----------------------------------------------------

    public function test_the_enquiry_limit_is_still_five_per_hour_per_ip(): void
    {
        $this->useLimiterStore('file');

        $statuses = array_map(fn () => $this->postEnquiry(['REMOTE_ADDR' => '198.51.100.20']), range(1, 6));

        $this->assertSame([422, 422, 422, 422, 422, 429], $statuses);

        $limited = $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.20'])->postJson('/api/v1/enquiries', [])->assertStatus(429);
        $this->assertSame('5', $limited->headers->get('X-RateLimit-Limit'));
        $this->assertGreaterThan(3000, (int) $limited->headers->get('Retry-After'), 'the enquiry window is an hour, not a minute');
        $this->assertLessThanOrEqual(3600, (int) $limited->headers->get('Retry-After'));

        $this->assertSame(422, $this->postEnquiry(['REMOTE_ADDR' => '198.51.100.21']), 'another IP has its own budget');
    }

    // -- Admin login: unchanged, now on the limiter store --------------------

    public function test_admin_login_throttling_is_unchanged_on_the_file_store(): void
    {
        $this->useLimiterStore('file');

        $attempt = fn (string $username) => $this->postJson('/admin/login', ['username' => $username, 'password' => 'wrong'])->getStatusCode();

        // 5 per username+IP ...
        $this->assertSame([422, 422, 422, 422, 422, 429], array_map(fn () => $attempt('ghost'), range(1, 6)));

        // ... and 20 per IP across usernames (5 were already spent above on this IP).
        $rotating = array_map(fn (int $i) => $attempt("rotating-{$i}"), range(1, 16));
        $this->assertSame(array_fill(0, 15, 422), array_slice($rotating, 0, 15));
        $this->assertSame(429, $rotating[15]);
    }

    public function test_a_successful_login_still_clears_only_the_username_counter_on_the_file_store(): void
    {
        $this->useLimiterStore('file');
        $user = User::factory()->create(['username' => 'jane.admin', 'password' => 'correct-password']);
        $user->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        foreach (range(1, 4) as $ignored) {
            $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'wrong'])->assertStatus(422);
        }
        $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'correct-password'])->assertOk();

        // The username counter was cleared, so five more wrong attempts are allowed before the 429.
        $statuses = array_map(fn () => $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'wrong'])->getStatusCode(), range(1, 6));
        $this->assertSame([422, 422, 422, 422, 422, 429], $statuses);
    }

    // -- Admin API: 240 writes/min/user --------------------------------------

    public function test_admin_writes_are_limited_to_240_per_minute_per_user_by_default(): void
    {
        $this->useLimiterStore('file');
        $admin = $this->admin();

        foreach (range(1, 240) as $n) {
            $status = $this->actingAs($admin)->postJson('/admin/faqs/reorder', [])->getStatusCode();
            $this->assertNotSame(429, $status, "write #{$n} must not be throttled");
        }

        $limited = $this->actingAs($admin)->postJson('/admin/faqs/reorder', [])->assertStatus(429);
        $this->assertSame('240', $limited->headers->get('X-RateLimit-Limit'));
        $this->assertGreaterThanOrEqual(1, (int) $limited->headers->get('Retry-After'));

        // Reads are not counted: the same user can still read while writes are throttled ...
        $this->actingAs($admin)->getJson('/admin/dashboard')->assertOk();
        $this->actingAs($admin)->getJson('/admin/faqs')->assertOk();
        // ... and another admin has a budget of their own.
        $this->actingAs($this->admin('other.admin'))->postJson('/admin/faqs/reorder', [])->assertStatus(422);
    }

    public function test_admin_reads_take_no_limiter_counter_at_all(): void
    {
        $this->useLimiterStore('database'); // where any counter work would be visible as cache SQL
        $admin = $this->admin();

        $this->assertSame([], $this->cacheTableQueries(fn () => $this->actingAs($admin)->getJson('/admin/faqs')->assertOk()));
    }

    public function test_the_admin_write_limit_follows_the_configured_value_and_does_not_count_for_the_unauthenticated(): void
    {
        $this->useLimiterStore('file');
        config(['security.rate_limits.admin_api' => 2]);

        // An unauthenticated caller is rejected before the throttle and spends nobody's budget.
        foreach (range(1, 5) as $ignored) {
            $this->postJson('/admin/faqs/reorder', [])->assertStatus(401);
        }

        $admin = $this->admin();
        $statuses = array_map(fn () => $this->actingAs($admin)->postJson('/admin/faqs/reorder', [])->getStatusCode(), range(1, 3));

        $this->assertNotContains(429, array_slice($statuses, 0, 2));
        $this->assertSame(429, $statuses[2]);
    }

    public function test_media_upload_keeps_its_own_stricter_limit(): void
    {
        $this->useLimiterStore('file');
        $admin = $this->admin();

        // No file: 422 from validation, but the request counts against the 20/min upload limit.
        $statuses = array_map(fn () => $this->actingAs($admin)->postJson('/admin/media', [])->getStatusCode(), range(1, 21));

        $this->assertNotContains(429, array_slice($statuses, 0, 20));
        $this->assertSame(429, $statuses[20]);
    }
}
