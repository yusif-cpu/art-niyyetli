<?php

namespace Tests\Unit\Support;

use App\Support\Cache\PublicContentCache;
use Illuminate\Contracts\Cache\Factory;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use LogicException;
use Mockery;
use RuntimeException;
use Tests\Support\ManipulatesEnvironment;
use Tests\TestCase;
use Throwable;

class PublicContentCacheTest extends TestCase
{
    use ManipulatesEnvironment;

    private PublicContentCache $cache;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cache = $this->app->make(PublicContentCache::class);
    }

    protected function tearDown(): void
    {
        $this->restoreEnvironment();

        parent::tearDown();
    }

    /** A callback that counts how many times it ran. */
    private function counting(mixed $value, int &$runs): callable
    {
        return function () use ($value, &$runs) {
            $runs++;

            return $value;
        };
    }

    public function test_a_value_is_computed_once_and_then_served_from_the_cache(): void
    {
        $runs = 0;

        $first = $this->cache->remember('k', 60, $this->counting(['a' => 1], $runs));
        $second = $this->cache->remember('k', 60, $this->counting(['a' => 2], $runs));

        $this->assertSame(['a' => 1], $first);
        $this->assertSame(['a' => 1], $second);
        $this->assertSame(1, $runs);
    }

    public function test_different_keys_are_cached_independently(): void
    {
        $this->assertSame('az', $this->cache->remember('homepage:az', 60, fn () => 'az'));
        $this->assertSame('en', $this->cache->remember('homepage:en', 60, fn () => 'en'));
        $this->assertSame('az', $this->cache->remember('homepage:az', 60, fn () => 'wrong'));
    }

    public function test_an_entry_is_stored_under_one_stable_key_stamped_with_the_content_version(): void
    {
        $this->cache->remember('site-settings', 60, fn () => 'stored');

        $this->assertSame(
            ['version' => $this->cache->version(), 'value' => 'stored'],
            Cache::get('public-content:entry:site-settings')
        );
        $this->assertNull(Cache::get('site-settings'), 'no un-namespaced key may be written');
    }

    public function test_bumping_never_creates_new_keys_because_entries_are_overwritten_in_place(): void
    {
        // The database and file stores never delete an expired entry that is not read again, so a key that changed on
        // every bump would leave a dead row or file behind after every admin write.
        $store = Cache::store()->getStore();
        $storage = new \ReflectionProperty($store, 'storage');
        $keys = fn () => array_keys($storage->getValue($store));

        $this->cache->remember('homepage:az', 60, fn () => 'v0');
        $this->cache->remember('navigation:az', 60, fn () => 'v0');
        $before = $keys();
        sort($before);

        foreach (range(1, 20) as $i) {
            $this->cache->bump();
            $this->assertSame("v{$i}", $this->cache->remember('homepage:az', 60, fn () => "v{$i}"));
            $this->assertSame("v{$i}", $this->cache->remember('navigation:az', 60, fn () => "v{$i}"));
        }

        $after = $keys();
        sort($after);
        $this->assertSame($before, $after);
    }

    public function test_a_null_result_is_cached_like_any_other(): void
    {
        $runs = 0;
        $this->assertNull($this->cache->remember('nothing', 60, $this->counting(null, $runs)));
        $this->assertNull($this->cache->remember('nothing', 60, $this->counting(null, $runs)));

        $this->assertSame(1, $runs);
    }

    public function test_a_foreign_or_malformed_entry_is_treated_as_a_miss(): void
    {
        Cache::put('public-content:entry:k', 'not an envelope', 60);
        $this->assertSame('fresh', $this->cache->remember('k', 60, fn () => 'fresh'));

        Cache::put('public-content:entry:k', ['version' => 'someone-else', 'value' => 'old'], 60);
        $this->assertSame('fresh again', $this->cache->remember('k', 60, fn () => 'fresh again'));
    }

    public function test_the_ttl_is_honoured(): void
    {
        $runs = 0;
        $this->cache->remember('k', 60, $this->counting('v', $runs));

        $this->travel(59)->seconds();
        $this->cache->remember('k', 60, $this->counting('v', $runs));
        $this->assertSame(1, $runs, 'still cached just inside the TTL');

        $this->travel(2)->seconds();
        $this->cache->remember('k', 60, $this->counting('v', $runs));
        $this->assertSame(2, $runs, 'recomputed once the TTL has passed');
    }

    public function test_bump_changes_the_version_and_invalidates_every_key_at_once(): void
    {
        $runs = 0;
        $this->cache->remember('a', 300, $this->counting('a1', $runs));
        $this->cache->remember('b', 300, $this->counting('b1', $runs));
        $before = $this->cache->version();

        $after = $this->cache->bump();

        $this->assertNotSame($before, $after);
        $this->assertSame($after, $this->cache->version());
        $this->assertSame('a2', $this->cache->remember('a', 300, fn () => 'a2'));
        $this->assertSame('b2', $this->cache->remember('b', 300, fn () => 'b2'));
    }

    public function test_every_bump_produces_a_new_version(): void
    {
        $versions = array_map(fn () => $this->cache->bump(), range(1, 25));

        $this->assertCount(25, array_unique($versions));
    }

    public function test_a_value_computed_while_an_edit_lands_is_never_served_after_it(): void
    {
        // The version is read before the callback runs, so a value read from the database just before an admin write
        // commits is filed under the old version and stays unreachable after the bump.
        $this->cache->remember('k', 60, function () {
            $this->cache->bump(); // the admin write lands while this request is still building its payload

            return 'computed-before-the-edit';
        });

        $this->assertSame('fresh', $this->cache->remember('k', 60, fn () => 'fresh'));
    }

    public function test_the_version_does_not_expire_with_the_entries(): void
    {
        $version = $this->cache->version();

        $this->travel(2)->days();

        $this->assertSame($version, $this->cache->version());
    }

    public function test_a_lost_version_never_resurrects_old_entries(): void
    {
        $this->cache->remember('k', 600, fn () => 'old-content');
        $old = $this->cache->version();

        Cache::forget('public-content:version'); // e.g. the store evicted it

        $this->assertNotSame($old, $this->cache->version());
        $this->assertSame('new-content', $this->cache->remember('k', 600, fn () => 'new-content'));
    }

    public function test_plain_data_round_trips_unchanged(): void
    {
        $payload = ['title' => 'Əsər', 'price' => 12.5, 'tags' => ['a', 'b'], 'none' => null, 'json' => '{"data":[]}'];

        $this->cache->remember('payload', 60, fn () => $payload);

        $this->assertSame($payload, $this->cache->remember('payload', 60, fn () => []));
    }

    // -- A cache outage must never take the site down ------------------------

    private function cacheWhoseStoreIs(?Repository $store, ?Throwable $failure = null): PublicContentCache
    {
        $factory = Mockery::mock(Factory::class);
        $failure !== null ? $factory->shouldReceive('store')->andThrow($failure) : $factory->shouldReceive('store')->andReturn($store);

        return new PublicContentCache($factory);
    }

    public function test_an_unavailable_store_serves_the_content_uncached_and_logs_a_warning(): void
    {
        Log::spy();
        $cache = $this->cacheWhoseStoreIs(null, new RuntimeException('cache down'));
        $runs = 0;

        $value = $cache->remember('k', 60, $this->counting('built from the database', $runs));

        $this->assertSame('built from the database', $value);
        $this->assertSame(1, $runs, 'the callback runs exactly once, not once per failed cache operation');
        Log::shouldHaveReceived('log')->with('warning', Mockery::type('string'), Mockery::type('array'))->once();
    }

    public function test_a_failing_write_still_returns_the_freshly_built_value(): void
    {
        Log::spy();
        $store = Mockery::mock(Repository::class);
        $store->shouldReceive('rememberForever')->andReturn('v1');
        $store->shouldReceive('get')->andReturn(null);
        $store->shouldReceive('put')->andThrow(new RuntimeException('disk full'));
        $runs = 0;

        $value = $this->cacheWhoseStoreIs($store)->remember('k', 60, $this->counting('fresh', $runs));

        $this->assertSame('fresh', $value);
        $this->assertSame(1, $runs);
        Log::shouldHaveReceived('log')->with('warning', Mockery::type('string'), Mockery::type('array'))->once();
    }

    public function test_bump_never_throws_when_the_store_is_unavailable_but_is_logged_as_an_error(): void
    {
        Log::spy();

        $version = $this->cacheWhoseStoreIs(null, new RuntimeException('cache down'))->bump();

        $this->assertNotSame('', $version);
        Log::shouldHaveReceived('log')->with('error', Mockery::type('string'), Mockery::type('array'))->once();
    }

    public function test_an_exception_from_the_callback_is_never_swallowed(): void
    {
        $runs = 0;
        $boom = function () use (&$runs) {
            $runs++;
            throw new LogicException('the database query failed');
        };

        foreach ([$this->cache, $this->cacheWhoseStoreIs(null, new RuntimeException('cache down'))] as $cache) {
            $runs = 0;
            try {
                $cache->remember('k', 60, $boom);
                $this->fail('the callback exception must propagate');
            } catch (LogicException $e) {
                $this->assertSame('the database query failed', $e->getMessage());
            }
            $this->assertSame(1, $runs);
        }
    }

    public function test_the_shipped_configuration_defaults(): void
    {
        $config = $this->configFileWith('public_cache', ['PUBLIC_API_CACHE_TTL' => null, 'PUBLIC_API_CACHE_SWR' => null]);

        $this->assertSame(60, $config['api_ttl']);
        $this->assertSame(0, $config['api_stale_while_revalidate'], 'stale-while-revalidate is opt-in');
        $this->assertSame(['site_settings' => 300, 'navigation' => 300, 'homepage' => 60, 'sitemap' => 600], $config['ttl']);
    }

    public function test_the_api_ttl_is_tunable_and_zero_turns_it_off(): void
    {
        $this->assertSame(30, $this->configFileWith('public_cache', ['PUBLIC_API_CACHE_TTL' => '30'])['api_ttl']);
        $this->assertSame(0, $this->configFileWith('public_cache', ['PUBLIC_API_CACHE_TTL' => '0'])['api_ttl']);
        $this->assertSame(120, $this->configFileWith('public_cache', ['PUBLIC_API_CACHE_SWR' => '120'])['api_stale_while_revalidate']);
    }

    public function test_a_nonsense_api_ttl_falls_back_to_the_default_instead_of_disabling_or_breaking_the_cache(): void
    {
        foreach (['', 'abc', 'sixty'] as $bad) {
            $config = $this->configFileWith('public_cache', ['PUBLIC_API_CACHE_TTL' => $bad, 'PUBLIC_API_CACHE_SWR' => $bad]);

            $this->assertSame(60, $config['api_ttl'], "value [{$bad}]");
            $this->assertSame(0, $config['api_stale_while_revalidate'], "value [{$bad}]");
        }

        $this->assertSame(0, $this->configFileWith('public_cache', ['PUBLIC_API_CACHE_TTL' => '-5'])['api_ttl'], 'a negative value never produces a negative max-age');
    }
}
