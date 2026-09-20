<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\ManipulatesEnvironment;
use Tests\TestCase;

/**
 * Cross-origin access to the public API. The SPA is same-origin, so the safe default is: no cross-origin access
 * in production, read-only and a narrow header list when a separate frontend is configured.
 */
class CorsTest extends TestCase
{
    use ManipulatesEnvironment, RefreshDatabase;

    private const ORIGIN = 'http://localhost:5173';

    private const OTHER_ORIGIN = 'https://gallery.example.org';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            // Two origins: the standard behaviour (echo the requester's origin only if it is listed, Vary: Origin).
            'cors.allowed_origins' => [self::ORIGIN, self::OTHER_ORIGIN],
            'cors.allowed_methods' => ['GET', 'HEAD', 'OPTIONS'],
            'cors.allowed_headers' => ['Accept', 'Content-Type', 'X-Requested-With'],
            'cors.max_age' => 600,
            'cors.supports_credentials' => false,
        ]);
    }

    protected function tearDown(): void
    {
        $this->restoreEnvironment();

        parent::tearDown();
    }

    private function preflight(string $method, ?string $headers = null, string $origin = self::ORIGIN, string $uri = '/api/v1/faqs'): TestResponse
    {
        $server = ['HTTP_ORIGIN' => $origin, 'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => $method];

        if ($headers !== null) {
            $server['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] = $headers;
        }

        return $this->call('OPTIONS', $uri, server: $server);
    }

    /** @return array<int, string> the lower-cased, trimmed items of a comma-separated header */
    private function listHeader(TestResponse $response, string $name): array
    {
        return array_values(array_filter(array_map(fn (string $item) => strtolower(trim($item)), explode(',', (string) $response->headers->get($name)))));
    }

    public function test_a_cross_origin_get_from_an_allowed_origin_is_allowed_without_credentials(): void
    {
        $response = $this->call('GET', '/api/v1/faqs', server: ['HTTP_ORIGIN' => self::ORIGIN]);

        $response->assertOk();
        $this->assertSame(self::ORIGIN, $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertStringContainsString('Origin', (string) $response->headers->get('Vary'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Credentials'));
    }

    public function test_a_disallowed_origin_gets_no_cors_headers_but_the_request_is_still_served(): void
    {
        $response = $this->call('GET', '/api/v1/faqs', server: ['HTTP_ORIGIN' => 'https://evil.example']);

        $response->assertOk();
        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
    }

    public function test_with_a_single_configured_origin_the_header_never_names_the_requester_or_a_wildcard(): void
    {
        // With exactly one origin configured the CORS library always answers with that origin; the browser then
        // rejects the mismatch. What matters is that an attacker's origin is never reflected and "*" is never sent.
        config(['cors.allowed_origins' => [self::ORIGIN]]);

        $response = $this->call('GET', '/api/v1/faqs', server: ['HTTP_ORIGIN' => 'https://evil.example']);

        $response->assertOk();
        $this->assertSame(self::ORIGIN, $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_with_no_origins_configured_cross_origin_reads_are_refused_and_same_origin_is_unaffected(): void
    {
        config(['cors.allowed_origins' => []]);

        $crossOrigin = $this->call('GET', '/api/v1/faqs', server: ['HTTP_ORIGIN' => self::ORIGIN]);
        $sameOrigin = $this->call('GET', '/api/v1/faqs');

        $this->assertFalse($crossOrigin->headers->has('Access-Control-Allow-Origin'));
        $sameOrigin->assertOk();
        $this->assertFalse($sameOrigin->headers->has('Access-Control-Allow-Origin'));
    }

    public function test_a_preflight_is_cached_for_ten_minutes_and_lists_only_read_methods(): void
    {
        $response = $this->preflight('GET', 'content-type');

        $response->assertStatus(204);
        $this->assertSame(self::ORIGIN, $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame('600', $response->headers->get('Access-Control-Max-Age'));
        $this->assertEqualsCanonicalizing(['get', 'head', 'options'], $this->listHeader($response, 'Access-Control-Allow-Methods'));
    }

    public function test_a_preflight_allows_exactly_the_headers_the_frontend_sends(): void
    {
        $response = $this->preflight('GET', 'content-type');

        $this->assertEqualsCanonicalizing(['accept', 'content-type', 'x-requested-with'], $this->listHeader($response, 'Access-Control-Allow-Headers'));
    }

    public function test_requested_headers_outside_the_allow_list_are_not_echoed_back(): void
    {
        // Previously "allowed_headers = *" reflected whatever the browser asked for, including Authorization.
        $response = $this->preflight('GET', 'authorization, x-xsrf-token, x-custom');

        $allowed = $this->listHeader($response, 'Access-Control-Allow-Headers');

        $this->assertNotContains('authorization', $allowed);
        $this->assertNotContains('x-xsrf-token', $allowed);
        $this->assertNotContains('x-custom', $allowed);
    }

    public function test_a_preflight_from_a_disallowed_origin_grants_nothing(): void
    {
        $response = $this->preflight('GET', 'content-type', 'https://evil.example');

        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
    }

    public function test_post_is_not_granted_cross_origin_by_default(): void
    {
        $response = $this->preflight('POST', 'content-type', uri: '/api/v1/enquiries');

        $this->assertNotContains('post', $this->listHeader($response, 'Access-Control-Allow-Methods'));
    }

    public function test_post_is_granted_cross_origin_when_the_methods_include_it(): void
    {
        config(['cors.allowed_methods' => ['GET', 'HEAD', 'OPTIONS', 'POST']]);

        $response = $this->preflight('POST', 'content-type', uri: '/api/v1/enquiries');

        $this->assertContains('post', $this->listHeader($response, 'Access-Control-Allow-Methods'));
        $this->assertSame(self::ORIGIN, $response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_a_production_preflight_behaves_as_hardened_using_the_shipped_config(): void
    {
        // Not the hand-set config from setUp(): the values the application really ships with, in production,
        // with one cross-origin frontend configured.
        config(['cors' => $this->configFileWith('cors', [
            'APP_ENV' => 'production',
            'PUBLIC_API_CORS_ORIGINS' => self::OTHER_ORIGIN,
            'PUBLIC_API_CORS_ALLOW_POST' => null,
        ])]);

        $response = $this->preflight('POST', 'authorization, content-type', self::OTHER_ORIGIN, '/api/v1/enquiries');

        $response->assertStatus(204);
        $this->assertSame(self::OTHER_ORIGIN, $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame('600', $response->headers->get('Access-Control-Max-Age'));
        $this->assertNotContains('post', $this->listHeader($response, 'Access-Control-Allow-Methods'));
        $this->assertEqualsCanonicalizing(['accept', 'content-type', 'x-requested-with'], $this->listHeader($response, 'Access-Control-Allow-Headers'));
        $this->assertNotContains('*', $this->listHeader($response, 'Access-Control-Allow-Headers'));
    }

    public function test_a_production_deployment_with_no_configuration_grants_no_cross_origin_access(): void
    {
        config(['cors' => $this->configFileWith('cors', ['APP_ENV' => 'production', 'PUBLIC_API_CORS_ORIGINS' => null])]);

        $get = $this->call('GET', '/api/v1/faqs', server: ['HTTP_ORIGIN' => self::ORIGIN]);
        $preflight = $this->preflight('GET', 'content-type');

        $get->assertOk();
        $this->assertFalse($get->headers->has('Access-Control-Allow-Origin'));
        $this->assertFalse($preflight->headers->has('Access-Control-Allow-Origin'));
    }

    public function test_cors_still_applies_only_to_the_api(): void
    {
        $response = $this->call('GET', '/robots.txt', server: ['HTTP_ORIGIN' => self::ORIGIN]);

        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
    }

    #[DataProvider('originEnvironments')]
    public function test_the_shipped_config_chooses_origins_from_the_environment(?string $appEnv, ?string $origins, array $expected): void
    {
        $config = $this->configFileWith('cors', ['APP_ENV' => $appEnv, 'PUBLIC_API_CORS_ORIGINS' => $origins]);

        $this->assertSame($expected, $config['allowed_origins']);
    }

    /** @return array<string, array{0: string|null, 1: string|null, 2: array<int, string>}> */
    public static function originEnvironments(): array
    {
        $dev = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'];

        return [
            'production, unset: none' => ['production', null, []],
            'app env unset, unset: none (fails closed)' => [null, null, []],
            'local, unset: dev origins' => ['local', null, $dev],
            'staging, unset: dev origins' => ['staging', null, $dev],
            'production, explicit list' => ['production', 'https://gallery.example.org, https://www.example.org', ['https://gallery.example.org', 'https://www.example.org']],
            'local, explicit empty means none' => ['local', '', []],
            'production, explicit empty means none' => ['production', '', []],
            'blank entries dropped' => ['production', ',https://a.example.org,, ', ['https://a.example.org']],
        ];
    }

    #[DataProvider('postFlags')]
    public function test_the_shipped_config_grants_post_only_when_asked(?string $flag, bool $expectsPost): void
    {
        $config = $this->configFileWith('cors', ['PUBLIC_API_CORS_ALLOW_POST' => $flag]);

        $this->assertSame($expectsPost, in_array('POST', $config['allowed_methods'], true));
        $this->assertSame(['GET', 'HEAD', 'OPTIONS'], array_values(array_intersect(['GET', 'HEAD', 'OPTIONS'], $config['allowed_methods'])));
    }

    /** @return array<string, array{0: string|null, 1: bool}> */
    public static function postFlags(): array
    {
        return ['unset' => [null, false], 'false' => ['false', false], 'true' => ['true', true]];
    }

    public function test_the_shipped_config_has_the_hardened_static_settings(): void
    {
        $config = $this->configFileWith('cors', []);

        $this->assertSame(['api/*'], $config['paths']);
        $this->assertSame(['Accept', 'Content-Type', 'X-Requested-With'], $config['allowed_headers']);
        $this->assertNotContains('*', $config['allowed_headers']);
        $this->assertSame(600, $config['max_age']);
        $this->assertFalse($config['supports_credentials']);
        $this->assertSame([], $config['allowed_origins_patterns']);
        $this->assertSame([], $config['exposed_headers']);
    }
}
