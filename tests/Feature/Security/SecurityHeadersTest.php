<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    /** The contract, spelled out literally so a config change cannot silently weaken it. */
    private const STATIC_HEADERS = [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'SAMEORIGIN',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        'Cross-Origin-Opener-Policy' => 'same-origin',
    ];

    private const REPORT_ONLY_POLICY = "default-src 'self'; script-src 'self'; style-src 'self'; "
        ."img-src 'self' data: https://cdn.example.org; font-src 'self'; connect-src 'self'; "
        ."frame-src https://www.youtube-nocookie.com; base-uri 'self'; form-action 'self'; object-src 'none'";

    protected function setUp(): void
    {
        parent::setUp();

        // Deterministic policy: an explicit CDN origin for media variants, report-only unless a test says otherwise.
        config([
            'filesystems.disks.public.url' => 'https://cdn.example.org/storage',
            'security.csp.mode' => 'report-only',
            'security.csp.report_uri' => null,
            'security.hsts.enabled' => false,
        ]);
        Storage::forgetDisk('public');
    }

    /** @return array<string, array{0: string, 1: string, 2: int}> */
    public static function responses(): array
    {
        return [
            'public shell 200' => ['GET', '/', 200],
            'public shell 404' => ['GET', '/no-such-page', 404],
            'sitemap' => ['GET', '/sitemap.xml', 200],
            'robots' => ['GET', '/robots.txt', 200],
            'api 200' => ['GET', '/api/v1/faqs', 200],
            'api unknown route 404' => ['GET', '/api/v1/nope', 404],
            'api validation 422' => ['GET', '/api/v1/artworks?artist=abc', 422],
            'api wrong method 405' => ['POST', '/api/v1/faqs', 405],
            'admin unauthenticated 401' => ['GET', '/admin/pages', 401],
            'admin shell 200' => ['GET', '/admin', 200],
        ];
    }

    #[DataProvider('responses')]
    public function test_every_kind_of_response_carries_each_static_header_exactly_once(string $method, string $uri, int $status): void
    {
        $response = $this->call($method, $uri);

        $response->assertStatus($status);

        foreach (self::STATIC_HEADERS as $name => $value) {
            $this->assertSame([$value], $response->headers->all(strtolower($name)), "{$name} on {$method} {$uri}");
        }
    }

    public function test_an_unhandled_exception_response_carries_the_headers(): void
    {
        config(['logging.default' => 'null']);
        Route::get('api/security-headers-boom', fn () => throw new RuntimeException('boom'));

        $response = $this->get('/api/security-headers-boom');

        $response->assertStatus(500);
        $this->assertSame(['SAMEORIGIN'], $response->headers->all('x-frame-options'));
        $this->assertSame(['nosniff'], $response->headers->all('x-content-type-options'));
    }

    public function test_a_response_short_circuited_by_other_global_middleware_still_carries_the_headers(): void
    {
        // ValidatePostSize rejects this before the request reaches the router.
        $response = $this->call('POST', '/api/v1/enquiries', server: ['CONTENT_LENGTH' => 64 * 1024 * 1024]);

        $response->assertStatus(413);
        $this->assertSame(['SAMEORIGIN'], $response->headers->all('x-frame-options'));
        $this->assertSame(['nosniff'], $response->headers->all('x-content-type-options'));
        $this->assertNotNull($response->headers->get('Content-Security-Policy-Report-Only'));
    }

    public function test_cors_preflight_responses_carry_the_headers_and_keep_their_cors_headers(): void
    {
        config(['cors.allowed_origins' => ['http://localhost:5173']]);

        $response = $this->call('OPTIONS', '/api/v1/faqs', server: [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);

        $response->assertStatus(204);
        $this->assertSame('http://localhost:5173', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame(['SAMEORIGIN'], $response->headers->all('x-frame-options'));
    }

    public function test_a_header_the_response_already_sets_is_not_replaced(): void
    {
        Route::get('api/security-headers-own', fn () => response('ok')->header('X-Frame-Options', 'DENY'));

        $response = $this->get('/api/security-headers-own');

        $this->assertSame(['DENY'], $response->headers->all('x-frame-options'));
        $this->assertSame(['nosniff'], $response->headers->all('x-content-type-options'));
    }

    public function test_a_header_can_be_disabled_in_config(): void
    {
        config(['security.headers.Cross-Origin-Opener-Policy' => null]);

        $response = $this->get('/api/v1/faqs');

        $this->assertFalse($response->headers->has('Cross-Origin-Opener-Policy'));
        $this->assertTrue($response->headers->has('X-Frame-Options'));
    }

    public function test_hsts_is_not_sent_over_plain_http_even_when_enabled(): void
    {
        config(['security.hsts.enabled' => true]);

        $this->assertFalse($this->get('http://localhost/api/v1/faqs')->headers->has('Strict-Transport-Security'));
    }

    public function test_hsts_is_not_sent_over_https_when_disabled(): void
    {
        $this->assertFalse($this->get('https://localhost/api/v1/faqs')->headers->has('Strict-Transport-Security'));
    }

    public function test_hsts_is_sent_over_https_when_enabled_without_subdomains_or_preload(): void
    {
        config(['security.hsts.enabled' => true]);

        $response = $this->get('https://localhost/api/v1/faqs');

        $this->assertSame(['max-age=31536000'], $response->headers->all('strict-transport-security'));
    }

    public function test_csp_is_report_only_and_not_enforcing_by_default(): void
    {
        $response = $this->get('/');

        $this->assertSame(self::REPORT_ONLY_POLICY, $response->headers->get('Content-Security-Policy-Report-Only'));
        $this->assertFalse($response->headers->has('Content-Security-Policy'));
    }

    public function test_the_shipped_defaults_are_report_only_csp_and_hsts_off(): void
    {
        $saved = [];

        foreach (['SECURITY_CSP', 'SECURITY_HSTS', 'SECURITY_CSP_REPORT_URI'] as $key) {
            $saved[$key] = [$_ENV[$key] ?? null, $_SERVER[$key] ?? null, getenv($key)];
            unset($_ENV[$key], $_SERVER[$key]);
            putenv($key);
        }

        try {
            $defaults = require base_path('config/security.php');
        } finally {
            foreach ($saved as $key => [$env, $server, $getenv]) {
                if ($env !== null) {
                    $_ENV[$key] = $env;
                }

                if ($server !== null) {
                    $_SERVER[$key] = $server;
                }

                if ($getenv !== false) {
                    putenv("{$key}={$getenv}");
                }
            }
        }

        $this->assertSame('report-only', $defaults['csp']['mode']);
        $this->assertNull($defaults['csp']['report_uri']);
        $this->assertFalse($defaults['hsts']['enabled']);
    }

    public function test_enforce_mode_sends_the_enforcing_header_only_and_adds_frame_ancestors(): void
    {
        config(['security.csp.mode' => 'enforce']);

        $response = $this->get('/');

        $this->assertSame(self::REPORT_ONLY_POLICY."; frame-ancestors 'self'", $response->headers->get('Content-Security-Policy'));
        $this->assertFalse($response->headers->has('Content-Security-Policy-Report-Only'));
    }

    public function test_off_mode_sends_no_csp_header_but_keeps_the_other_headers(): void
    {
        config(['security.csp.mode' => 'off']);

        $response = $this->get('/');

        $this->assertFalse($response->headers->has('Content-Security-Policy'));
        $this->assertFalse($response->headers->has('Content-Security-Policy-Report-Only'));
        $this->assertTrue($response->headers->has('X-Frame-Options'));
    }

    #[DataProvider('unrecognisedModes')]
    public function test_an_unrecognised_mode_never_enforces_and_never_disables(mixed $mode): void
    {
        config(['security.csp.mode' => $mode]);

        $response = $this->get('/api/v1/faqs');

        $this->assertSame(self::REPORT_ONLY_POLICY, $response->headers->get('Content-Security-Policy-Report-Only'));
        $this->assertFalse($response->headers->has('Content-Security-Policy'));
    }

    /** @return array<string, array{0: mixed}> */
    public static function unrecognisedModes(): array
    {
        return ['typo' => ['enforced'], 'wrong case' => ['Enforce'], 'empty' => [''], 'null' => [null]];
    }

    public function test_csp_is_skipped_while_the_vite_dev_server_is_running(): void
    {
        $publicPath = sys_get_temp_dir().'/security-headers-'.uniqid();
        mkdir($publicPath);
        file_put_contents($publicPath.'/hot', 'http://localhost:5173');
        $this->app->usePublicPath($publicPath);

        try {
            $response = $this->get('/api/v1/faqs');

            $this->assertFalse($response->headers->has('Content-Security-Policy'));
            $this->assertFalse($response->headers->has('Content-Security-Policy-Report-Only'));
            $this->assertTrue($response->headers->has('X-Frame-Options'));
        } finally {
            File::deleteDirectory($publicPath);
        }
    }

    public function test_a_response_that_sets_its_own_csp_is_left_alone(): void
    {
        Route::get('api/security-headers-csp', fn () => response('ok')->header('Content-Security-Policy', "default-src 'none'"));

        $response = $this->get('/api/security-headers-csp');

        $this->assertSame(["default-src 'none'"], $response->headers->all('content-security-policy'));
        $this->assertFalse($response->headers->has('Content-Security-Policy-Report-Only'));
    }

    public function test_the_media_origin_follows_the_public_disk_including_a_port(): void
    {
        config(['filesystems.disks.public.url' => 'https://media.example.org:8443/files']);
        Storage::forgetDisk('public');

        $policy = $this->get('/api/v1/faqs')->headers->get('Content-Security-Policy-Report-Only');

        $this->assertStringContainsString("img-src 'self' data: https://media.example.org:8443;", $policy);
    }

    public function test_an_unresolvable_media_disk_falls_back_to_self_only(): void
    {
        config(['media.disks.public' => 'no-such-disk']);

        $policy = $this->get('/api/v1/faqs')->headers->get('Content-Security-Policy-Report-Only');

        $this->assertStringContainsString("img-src 'self' data:;", $policy);
    }

    public function test_a_valid_report_uri_is_appended(): void
    {
        config(['security.csp.report_uri' => 'https://reports.example.org/csp']);

        $policy = $this->get('/api/v1/faqs')->headers->get('Content-Security-Policy-Report-Only');

        $this->assertStringEndsWith('; report-uri https://reports.example.org/csp', $policy);
    }

    #[DataProvider('invalidReportUris')]
    public function test_an_invalid_report_uri_is_ignored_so_it_cannot_inject_directives(string $uri): void
    {
        config(['security.csp.report_uri' => $uri]);

        $policy = $this->get('/api/v1/faqs')->headers->get('Content-Security-Policy-Report-Only');

        $this->assertSame(self::REPORT_ONLY_POLICY, $policy);
    }

    /** @return array<string, array{0: string}> */
    public static function invalidReportUris(): array
    {
        return [
            'directive injection' => ['https://x.example.org/csp; script-src *'],
            'whitespace' => ['https://x.example.org/a b'],
            'list' => ['https://a.example.org,https://b.example.org'],
            'javascript scheme' => ['javascript:alert(1)'],
            'empty' => [''],
        ];
    }
}
