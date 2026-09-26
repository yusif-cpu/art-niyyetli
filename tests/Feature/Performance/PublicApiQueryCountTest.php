<?php

namespace Tests\Feature\Performance;

use App\Support\Cache\PublicContentCache;
use Database\Seeders\BenchmarkSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\Support\CountsQueries;
use Tests\TestCase;

/**
 * Query-budget and N+1 guard for every public endpoint (the JSON API, the server-rendered
 * SPA shell, the sitemap and robots.txt).
 *
 * The data comes from BenchmarkSeeder so every relation each endpoint eager-loads is
 * populated. Two properties are asserted:
 *
 *  1. The query count is identical for a small and a much larger dataset — the definition
 *     of "no N+1": adding rows must never add queries.
 *  2. The count stays within a recorded ceiling, so an extra query is a visible, reviewed
 *     change rather than a silent regression.
 *
 * The counts are data queries only. In PHPUnit the cache and session stores are `array`
 * (phpunit.xml), so the database-backed rate limiter (6 SQL per request on the running app,
 * Phase 12 finding P-02) and database sessions (P-01) are NOT included; the throttle
 * middleware is disabled here because ~60 requests per test would otherwise trip the
 * 60/min limit. Later Phase 12 tasks lower the ceilings as they remove queries — only ever
 * tighten a ceiling in the same change that removes the queries.
 */
class PublicApiQueryCountTest extends TestCase
{
    use CountsQueries, RefreshDatabase;

    /**
     * Baseline recorded by Phase 12 Task 0 (2026-09-20, commit 599afde + Task 0).
     *
     * @var array<string, int>
     */
    private const CEILINGS = [
        'api homepage' => 58, // 56 + one id query per exhibition status (current and upcoming lists)
        'api artworks' => 12,
        'api artworks filtered+sorted' => 12,
        'api artwork detail' => 26, // 25 + the one seo_metadata eager load (SEO overrides in detail responses)
        'api artists' => 4,
        'api artist detail' => 19, // 18 + the seo_metadata eager load
        'api exhibitions' => 19,
        'api exhibitions current' => 19,
        'api exhibition detail' => 20, // 19 + the seo_metadata eager load
        'api articles' => 5,
        'api article detail' => 6, // 5 + the seo_metadata eager load
        'api page (with image sections)' => 8, // 7 + the seo_metadata eager load
        'api pages' => 2,
        'api navigation' => 3,
        'api site-settings' => 3,
        'api social-links' => 3,
        'api faqs' => 2,
        'api enquiry-subjects' => 2,
        'ssr home' => 10,
        'ssr static page' => 4,
        'ssr artwork detail' => 8,
        'ssr artist detail' => 6,
        'sitemap.xml' => 9,
        'robots.txt' => 0,
    ];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_query_counts_do_not_grow_with_the_amount_of_data(): void
    {
        $seeder = new BenchmarkSeeder;

        $handles = $seeder->populate(3);
        $small = $this->measureAll($handles);

        $seeder->populate(25);
        $large = $this->measureAll($handles);

        foreach ($small as $name => $count) {
            $this->assertSame(
                $count,
                $large[$name],
                "N+1 suspected on [{$name}]: {$count} queries with a small dataset, {$large[$name]} after adding 25 more artworks and their related rows."
            );
        }
    }

    public function test_query_counts_stay_within_the_recorded_baseline(): void
    {
        $counts = $this->measureAll((new BenchmarkSeeder)->populate(3));

        $this->assertEqualsCanonicalizing(
            array_keys(self::CEILINGS),
            array_keys($counts),
            'The CEILINGS map must list exactly the measured endpoints — add a ceiling when adding an endpoint.'
        );

        foreach ($counts as $name => $count) {
            $this->assertLessThanOrEqual(
                self::CEILINGS[$name],
                $count,
                "[{$name}] now runs {$count} queries; the recorded ceiling is ".self::CEILINGS[$name].'.'
            );
        }
    }

    /**
     * @param  array<string, string>  $handles
     * @return array<string, int> queries per endpoint
     */
    private function measureAll(array $handles): array
    {
        $counts = [];

        foreach ($this->endpoints($handles) as $name => [$kind, $url]) {
            $send = fn () => $kind === 'json' ? $this->getJson($url) : $this->get($url);

            $send()->assertOk(); // warm-up: absorbs one-off work and proves the URL is valid

            // The public content cache (Task 9) would serve the measured request from the warm-up's entry and report 0
            // queries, hiding an N+1 in the cached endpoints. Invalidating it first measures the real (cold) query
            // structure; the warm-cache numbers are asserted in PublicCacheInvalidationTest.
            app(PublicContentCache::class)->bump();

            $response = null;
            $counts[$name] = $this->countQueries(function () use (&$response, $send) {
                $response = $send();
            });
            $response?->assertOk();
        }

        return $counts;
    }

    /**
     * @param  array<string, string>  $h
     * @return array<string, array{0: string, 1: string}>
     */
    private function endpoints(array $h): array
    {
        return [
            'api homepage' => ['json', '/api/v1/homepage'],
            'api artworks' => ['json', '/api/v1/artworks'],
            'api artworks filtered+sorted' => ['json', '/api/v1/artworks?genre=bench-genre-0&sort=price_asc&per_page=12'],
            'api artwork detail' => ['json', "/api/v1/artworks/{$h['artwork_code']}"],
            'api artists' => ['json', '/api/v1/artists'],
            'api artist detail' => ['json', "/api/v1/artists/{$h['artist_slug']}"],
            'api exhibitions' => ['json', '/api/v1/exhibitions'],
            'api exhibitions current' => ['json', '/api/v1/exhibitions?filter=current'],
            'api exhibition detail' => ['json', "/api/v1/exhibitions/{$h['exhibition_slug']}"],
            'api articles' => ['json', '/api/v1/articles'],
            'api article detail' => ['json', "/api/v1/articles/{$h['article_slug']}"],
            'api page (with image sections)' => ['json', "/api/v1/pages/{$h['page_slug']}"],
            'api pages' => ['json', '/api/v1/pages'],
            'api navigation' => ['json', '/api/v1/navigation'],
            'api site-settings' => ['json', '/api/v1/site-settings'],
            'api social-links' => ['json', '/api/v1/social-links'],
            'api faqs' => ['json', '/api/v1/faqs'],
            'api enquiry-subjects' => ['json', '/api/v1/enquiry-subjects'],
            'ssr home' => ['html', '/'],
            'ssr static page' => ['html', "/{$h['page_slug']}"],
            'ssr artwork detail' => ['html', "/artworks/{$h['artwork_code']}"],
            'ssr artist detail' => ['html', "/artists/{$h['artist_slug']}"],
            'sitemap.xml' => ['html', '/sitemap.xml'],
            'robots.txt' => ['html', '/robots.txt'],
        ];
    }
}
