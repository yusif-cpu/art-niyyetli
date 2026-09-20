<?php

namespace Tests\Feature\Security;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\ManipulatesEnvironment;
use Tests\TestCase;

class TrustedProxyTest extends TestCase
{
    use ManipulatesEnvironment, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // What the application sees after the TrustProxies middleware has run.
        Route::get('api/trusted-proxy-probe', fn (Request $request) => response()->json([
            'ip' => $request->ip(),
            'secure' => $request->isSecure(),
            'scheme' => $request->getScheme(),
            'host' => $request->getHost(),
            'port' => $request->getPort(),
            'base_url' => $request->getBaseUrl(),
        ]));

        config(['security.hsts.enabled' => false]);
    }

    protected function tearDown(): void
    {
        // Symfony keeps the trusted-proxy list in static state: do not leak it into later tests.
        Request::setTrustedProxies([], Request::HEADER_X_FORWARDED_FOR);
        $this->restoreEnvironment();

        parent::tearDown();
    }

    /** @param array<string, string> $server */
    private function probe(array $server): array
    {
        return $this->call('GET', '/api/trusted-proxy-probe', server: $server)->assertOk()->json();
    }

    private function trust(array|string $proxies): void
    {
        config(['trustedproxy.proxies' => $proxies]);
    }

    /** Applies exactly what the application ships with when TRUSTED_PROXIES is not set at all. */
    private function useShippedDefault(): void
    {
        $this->trust($this->configFileWith('trustedproxy', ['TRUSTED_PROXIES' => null])['proxies']);
    }

    public function test_by_default_no_proxy_is_trusted_and_forwarded_headers_are_ignored(): void
    {
        $this->useShippedDefault();

        $seen = $this->probe([
            'REMOTE_ADDR' => '203.0.113.5',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.7',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_HOST' => 'forged.example',
            'HTTP_X_FORWARDED_PORT' => '8443',
        ]);

        $this->assertSame('203.0.113.5', $seen['ip']);
        $this->assertFalse($seen['secure']);
        $this->assertSame('http', $seen['scheme']);
        $this->assertSame('localhost', $seen['host']);
        $this->assertNotSame(8443, $seen['port']);
    }

    public function test_forwarded_headers_from_a_trusted_proxy_give_the_real_client_ip_scheme_host_and_port(): void
    {
        $this->trust(['10.0.0.0/8']);

        $seen = $this->probe([
            'REMOTE_ADDR' => '10.1.2.3',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.7',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_HOST' => 'gallery.example.org',
            'HTTP_X_FORWARDED_PORT' => '443',
        ]);

        $this->assertSame('198.51.100.7', $seen['ip']);
        $this->assertTrue($seen['secure']);
        $this->assertSame('https', $seen['scheme']);
        $this->assertSame('gallery.example.org', $seen['host']);
        $this->assertSame(443, $seen['port']);
    }

    public function test_forwarded_headers_from_a_peer_that_is_not_trusted_are_ignored(): void
    {
        $this->trust(['10.0.0.0/8']);

        $seen = $this->probe([
            'REMOTE_ADDR' => '203.0.113.5',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.7',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);

        $this->assertSame('203.0.113.5', $seen['ip']);
        $this->assertFalse($seen['secure']);
    }

    public function test_a_list_of_exact_addresses_and_ranges_is_honoured(): void
    {
        $this->trust(['10.0.0.5', '192.168.0.0/16']);

        foreach (['10.0.0.5', '192.168.44.9'] as $proxy) {
            $this->assertSame('198.51.100.7', $this->probe(['REMOTE_ADDR' => $proxy, 'HTTP_X_FORWARDED_FOR' => '198.51.100.7'])['ip'], $proxy);
        }

        // 10.0.0.6 is next to a trusted address, not a trusted address.
        $this->assertSame('10.0.0.6', $this->probe(['REMOTE_ADDR' => '10.0.0.6', 'HTTP_X_FORWARDED_FOR' => '198.51.100.7'])['ip']);
    }

    public function test_a_proxy_chain_yields_the_client_behind_the_last_trusted_proxy(): void
    {
        $this->trust(['10.0.0.0/8']);

        $seen = $this->probe(['REMOTE_ADDR' => '10.1.2.3', 'HTTP_X_FORWARDED_FOR' => '198.51.100.7, 10.1.2.4']);

        $this->assertSame('198.51.100.7', $seen['ip']);
    }

    public function test_a_client_cannot_smuggle_a_fake_ip_in_front_of_the_real_one(): void
    {
        $this->trust(['10.0.0.0/8']);

        // The proxy appended the real client (198.51.100.7); the client had pre-filled a fake first hop.
        $seen = $this->probe(['REMOTE_ADDR' => '10.1.2.3', 'HTTP_X_FORWARDED_FOR' => '1.2.3.4, 198.51.100.7']);

        $this->assertSame('198.51.100.7', $seen['ip']);
    }

    public function test_star_trusts_any_connecting_host(): void
    {
        $this->trust('*');

        $this->assertSame('198.51.100.7', $this->probe(['REMOTE_ADDR' => '203.0.113.5', 'HTTP_X_FORWARDED_FOR' => '198.51.100.7'])['ip']);
    }

    public function test_only_the_four_documented_forwarded_headers_are_honoured(): void
    {
        $this->trust(['10.0.0.0/8']);

        $seen = $this->probe([
            'REMOTE_ADDR' => '10.1.2.3',
            'HTTP_X_FORWARDED_PREFIX' => '/forged-prefix',
        ]);

        $this->assertSame('', $seen['base_url']);
    }

    #[DataProvider('spoofableHosts')]
    public function test_a_forged_host_header_cannot_make_the_application_trust_forwarded_headers(string $host): void
    {
        // Regression: with no proxy configuration the framework used to trust EVERY proxy for a request whose
        // Host ended in .on-forge.com or .on-vapor.com — a header the client controls — which let anyone spoof
        // their IP and defeat every IP-based rate limit, including the admin login throttle.
        $this->useShippedDefault();

        $seen = $this->probe([
            'HTTP_HOST' => $host,
            'REMOTE_ADDR' => '203.0.113.5',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.7',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);

        $this->assertSame('203.0.113.5', $seen['ip']);
        $this->assertFalse($seen['secure']);
    }

    /** @return array<string, array{0: string}> */
    public static function spoofableHosts(): array
    {
        return ['forge' => ['evil.on-forge.com'], 'vapor' => ['evil.on-vapor.com']];
    }

    #[DataProvider('proxyEnvironments')]
    public function test_the_shipped_config_parses_the_trusted_proxies_variable(?string $value, array|string $expected): void
    {
        $config = $this->configFileWith('trustedproxy', ['TRUSTED_PROXIES' => $value]);

        $this->assertSame($expected, $config['proxies']);
    }

    /** @return array<string, array{0: string|null, 1: array<int, string>|string}> */
    public static function proxyEnvironments(): array
    {
        return [
            'unset is an empty list, never null' => [null, []],
            'empty' => ['', []],
            'blank' => ['   ', []],
            'single address' => ['10.0.0.5', ['10.0.0.5']],
            'list with spaces and gaps' => [' 10.0.0.5 , 172.16.0.0/12 ,, ', ['10.0.0.5', '172.16.0.0/12']],
            'star' => ['*', '*'],
            'double star' => ['**', '*'],
            'star among others' => ['10.0.0.5,*', '*'],
            'remote addr token' => ['REMOTE_ADDR', ['REMOTE_ADDR']],
        ];
    }

    public function test_the_configuration_flows_through_to_the_middleware_when_set_via_the_environment(): void
    {
        $this->trust($this->configFileWith('trustedproxy', ['TRUSTED_PROXIES' => '10.0.0.0/8'])['proxies']);

        $this->assertSame('198.51.100.7', $this->probe(['REMOTE_ADDR' => '10.9.9.9', 'HTTP_X_FORWARDED_FOR' => '198.51.100.7'])['ip']);
    }

    private function postEnquiry(string $peer, string $client): int
    {
        return $this->call('POST', '/api/v1/enquiries', server: [
            'REMOTE_ADDR' => $peer,
            'HTTP_X_FORWARDED_FOR' => $client,
            'HTTP_ACCEPT' => 'application/json',
        ])->getStatusCode();
    }

    public function test_enquiry_rate_limit_is_per_real_client_behind_a_trusted_proxy(): void
    {
        $this->trust(['10.0.0.0/8']);

        // An empty submission fails validation (422) but still counts against the 5-per-hour limit.
        $statuses = array_map(fn () => $this->postEnquiry('10.0.0.5', '198.51.100.1'), range(1, 6));

        $this->assertSame([422, 422, 422, 422, 422, 429], $statuses);
        // A different visitor behind the same proxy is unaffected.
        $this->assertSame(422, $this->postEnquiry('10.0.0.5', '198.51.100.2'));
    }

    public function test_enquiry_rate_limit_cannot_be_evaded_by_rotating_a_forged_forwarded_ip(): void
    {
        $this->useShippedDefault();

        $statuses = array_map(fn (int $i) => $this->postEnquiry('203.0.113.5', "198.51.100.{$i}"), range(1, 6));

        $this->assertSame([422, 422, 422, 422, 422, 429], $statuses);
    }

    private function loginAttempt(string $peer, string $client, string $host = 'localhost'): int
    {
        return $this->call('POST', '/admin/login', ['username' => 'nobody', 'password' => 'wrong'], server: [
            'HTTP_HOST' => $host,
            'REMOTE_ADDR' => $peer,
            'HTTP_X_FORWARDED_FOR' => $client,
            'HTTP_ACCEPT' => 'application/json',
        ])->getStatusCode();
    }

    public function test_login_throttling_cannot_be_evaded_by_rotating_a_forged_forwarded_ip(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class);
        $this->useShippedDefault();

        $statuses = array_map(fn (int $i) => $this->loginAttempt('203.0.113.5', "198.51.100.{$i}"), range(1, 7));

        $this->assertSame([422, 422, 422, 422, 422, 429, 429], $statuses);
    }

    public function test_login_throttling_cannot_be_evaded_by_combining_a_forged_host_with_a_forged_forwarded_ip(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class);
        $this->useShippedDefault();

        $statuses = array_map(fn (int $i) => $this->loginAttempt('203.0.113.5', "198.51.100.{$i}", 'evil.on-forge.com'), range(1, 7));

        $this->assertSame([422, 422, 422, 422, 422, 429, 429], $statuses);
    }

    public function test_login_throttling_is_per_real_client_behind_a_trusted_proxy(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class);
        $this->trust(['10.0.0.0/8']);

        $sameClient = array_map(fn () => $this->loginAttempt('10.0.0.5', '198.51.100.1'), range(1, 6));
        $otherClient = $this->loginAttempt('10.0.0.5', '198.51.100.2');

        $this->assertSame([422, 422, 422, 422, 422, 429], $sameClient);
        $this->assertSame(422, $otherClient, 'a different visitor behind the same proxy is not locked out');
    }

    public function test_an_administrator_can_still_log_in_through_a_trusted_https_proxy(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class);
        $this->trust(['10.0.0.0/8']);
        $admin = User::factory()->create(['username' => 'jane.admin']);
        $admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));

        $response = $this->call('POST', '/admin/login', ['username' => 'jane.admin', 'password' => 'password'], server: [
            'REMOTE_ADDR' => '10.0.0.5',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.9',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_ACCEPT' => 'application/json',
        ]);

        $response->assertOk()->assertJson(['message' => 'Authenticated.']);
        $this->assertAuthenticatedAs($admin);
    }

    public function test_hsts_follows_the_forwarded_scheme_only_from_a_trusted_proxy(): void
    {
        config(['security.hsts.enabled' => true]);
        $this->trust(['10.0.0.0/8']);
        $https = ['HTTP_X_FORWARDED_PROTO' => 'https'];

        // Absolute http:// URLs: the test client otherwise builds each request's URL from the PREVIOUS request's
        // scheme, so a trusted https request would make the next one look secure. Production has no such carry-over.
        $trusted = $this->call('GET', 'http://localhost/api/v1/faqs', server: ['REMOTE_ADDR' => '10.0.0.5'] + $https);
        $untrusted = $this->call('GET', 'http://localhost/api/v1/faqs', server: ['REMOTE_ADDR' => '203.0.113.5'] + $https);
        $trustedButPlainHttp = $this->call('GET', 'http://localhost/api/v1/faqs', server: ['REMOTE_ADDR' => '10.0.0.5', 'HTTP_X_FORWARDED_PROTO' => 'http']);

        $this->assertSame(['max-age=31536000'], $trusted->headers->all('strict-transport-security'));
        $this->assertFalse($untrusted->headers->has('Strict-Transport-Security'), 'a client must not be able to switch HSTS on by sending the header');
        $this->assertFalse($trustedButPlainHttp->headers->has('Strict-Transport-Security'));
    }
}
