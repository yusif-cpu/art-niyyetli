<?php

namespace Tests\Unit\Console;

use App\Models\SiteSetting;
use App\Models\User;
use Dotenv\Dotenv;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PreflightCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $publicPath;

    protected function setUp(): void
    {
        parent::setUp();

        // A private public/ directory, so the storage-link and frontend-build checks are
        // deterministic whatever state the real public/ is in.
        $this->publicPath = sys_get_temp_dir().'/preflight-'.uniqid();
        mkdir($this->publicPath.'/build', 0777, true);
        mkdir($this->publicPath.'/storage');
        file_put_contents($this->publicPath.'/build/manifest.json', '{}');
        $this->app->usePublicPath($this->publicPath);

        // Deliberately not relying on APP_ENV: in the Docker container it is a real
        // environment variable set to `local`, which phpunit.xml does not override.
        $this->app->detectEnvironment(fn () => 'production');

        config([
            'app.debug' => false,
            'app.key' => 'base64:'.base64_encode(str_repeat('a', 32)),
            'app.url' => 'https://gallery.example.org',
            'session.secure' => true,
            'session.driver' => 'database',
            'logging.default' => 'stack',
            'logging.channels.stack.channels' => ['daily'],
            'logging.channels.daily.level' => 'warning',
            'mail.default' => 'smtp',
            'cache.default' => 'file',
            'cache.limiter' => 'file',
            // The limiter's counters directory: a private one, so the check does not depend on the real storage/.
            'cache.stores.file.path' => $this->publicPath.'/cache',
            'cors.allowed_origins' => [],
            'gallery.enquiry_notification_email' => 'gallery@example.org',
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->publicPath);

        parent::tearDown();
    }

    /** @return array{0: int, 1: string} exit code and output */
    private function preflight(array $options = []): array
    {
        $exit = Artisan::call('app:preflight', $options);

        return [$exit, Artisan::output()];
    }

    public function test_a_valid_production_configuration_passes(): void
    {
        [$exit, $output] = $this->preflight();

        $this->assertSame(0, $exit, $output);
        $this->assertStringContainsString('Preflight passed.', $output);
        $this->assertStringNotContainsString(' FAIL ', $output);
        $this->assertStringNotContainsString(' WARN ', $output);
    }

    /**
     * Each mutation breaks exactly one production requirement: the run must fail, name the
     * requirement, and report exactly the expected number of failed checks (so no check
     * reports a false positive on an otherwise valid configuration).
     */
    #[DataProvider('failingConfigurations')]
    public function test_each_broken_requirement_fails_the_run(callable $mutate, string $expectedText, int $expectedFailures = 1): void
    {
        $mutate();

        [$exit, $output] = $this->preflight();

        $this->assertSame(1, $exit, $output);
        $this->assertStringContainsString($expectedText, $output);
        $this->assertSame($expectedFailures, substr_count($output, ' FAIL '), $output);
        $this->assertStringContainsString('Preflight failed', $output);
    }

    /** @return array<string, array{0: callable, 1: string, 2?: int}> */
    public static function failingConfigurations(): array
    {
        return [
            'debug enabled' => [fn () => config(['app.debug' => true]), 'is true: error pages would expose'],
            'empty app key' => [fn () => config(['app.key' => '']), 'APP_KEY'],
            'http app url' => [fn () => config(['app.url' => 'http://gallery.example.org']), 'is not https'],
            'localhost app url' => [fn () => config(['app.url' => 'https://localhost']), 'is a local address'],
            'default app url' => [fn () => config(['app.url' => 'http://localhost:8080']), 'is a local address'],
            'insecure session cookie' => [fn () => config(['session.secure' => false]), 'SESSION_SECURE_COOKIE'],
            'unset session cookie flag' => [fn () => config(['session.secure' => null]), 'SESSION_SECURE_COOKIE'],
            'array session driver' => [fn () => config(['session.driver' => 'array']), 'SESSION_DRIVER'],
            'debug log level' => [fn () => config(['logging.channels.daily.level' => 'debug']), 'LOG_LEVEL'],
            'log mailer' => [fn () => config(['mail.default' => 'log']), 'MAIL_MAILER'],
            'array mailer' => [fn () => config(['mail.default' => 'array']), 'MAIL_MAILER'],
            // The limiter has its own store, so an unshared default cache store fails only the CACHE_STORE check ...
            'array cache store' => [fn () => config(['cache.default' => 'array']), 'CACHE_STORE'],
            'array limiter store' => [fn () => config(['cache.limiter' => 'array']), 'Rate limiter store'],
            // ... unless the limiter is unset (null), when the framework falls back to the default store, so the check must too.
            'unset limiter store on an array default' => [fn () => config(['cache.limiter' => null, 'cache.default' => 'array']), 'Rate limiter store', 2],
            'limiter store that is not defined' => [fn () => config(['cache.limiter' => 'nope']), 'is not a defined cache store'],
            'empty limiter store' => [fn () => config(['cache.limiter' => '']), 'is not a defined cache store'],
            'limiter directory that is not a directory' => [fn () => config(['cache.stores.file.path' => __FILE__]), 'is not a writable directory'],
            'localhost cors origin' => [fn () => config(['cors.allowed_origins' => ['http://localhost:5173']]), 'PUBLIC_API_CORS_ORIGINS'],
            'malformed cors origin' => [fn () => config(['cors.allowed_origins' => ['*']]), 'PUBLIC_API_CORS_ORIGINS'],
            'missing storage link' => [fn () => rmdir(public_path('storage')), 'public/storage'],
            'missing frontend build' => [fn () => unlink(public_path('build/manifest.json')), 'npm run build'],
            'seeded test account' => [fn () => User::factory()->create(['email' => 'test@example.com']), 'test@example.com'],
        ];
    }

    public function test_the_environment_must_be_production_when_enforcing_with_strict(): void
    {
        $this->app->detectEnvironment(fn () => 'local');

        [$exit, $output] = $this->preflight(['--strict' => true]);

        $this->assertSame(1, $exit, $output);
        $this->assertStringContainsString('APP_ENV', $output);
        $this->assertStringContainsString('is "local"', $output);
    }

    public function test_failures_are_reported_but_not_enforced_outside_production(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        config(['app.debug' => true]);

        [$exit, $output] = $this->preflight();

        $this->assertSame(0, $exit, $output);
        $this->assertStringContainsString(' FAIL ', $output);
        $this->assertStringContainsString('not enforced', $output);
    }

    public function test_warnings_never_fail_the_run(): void
    {
        config([
            'logging.channels.stack.channels' => ['single'],
            'logging.channels.single.level' => 'warning',
            'cache.default' => 'database',
            'gallery.enquiry_notification_email' => null,
        ]);

        [$exit, $output] = $this->preflight();

        $this->assertSame(0, $exit, $output);
        $this->assertSame(3, substr_count($output, ' WARN '), $output);
        $this->assertStringContainsString('LOG_STACK', $output);
        $this->assertStringContainsString('CACHE_STORE', $output);
        $this->assertStringContainsString('Enquiry recipient', $output);
        $this->assertStringContainsString('Preflight passed.', $output);
    }

    public function test_a_database_limiter_store_is_a_warning_and_a_missing_file_limiter_directory_is_fine(): void
    {
        config(['cache.limiter' => 'database']);

        [$exit, $output] = $this->preflight();

        $this->assertSame(0, $exit, $output);
        $this->assertSame(1, substr_count($output, ' WARN '), $output);
        $this->assertStringContainsString('Rate limiter store', $output);
        $this->assertStringContainsString('CACHE_LIMITER_STORE=file', $output);

        // The file store creates its directory on first use, so a directory that does not exist yet passes.
        config(['cache.limiter' => 'file', 'cache.stores.file.path' => $this->publicPath.'/cache/not/created/yet']);

        [$exit, $output] = $this->preflight();

        $this->assertSame(0, $exit, $output);
        $this->assertStringNotContainsString(' WARN ', $output);
        $this->assertStringNotContainsString(' FAIL ', $output);
    }

    public function test_forwarded_headers_without_trusted_proxies_are_a_warning_not_a_failure(): void
    {
        config(['trustedproxy.proxies' => []]);
        $_SERVER['HTTP_X_FORWARDED_FOR'] = '198.51.100.7';

        try {
            [$exit, $output] = $this->preflight();
        } finally {
            unset($_SERVER['HTTP_X_FORWARDED_FOR']);
        }

        $this->assertSame(0, $exit, $output);
        $this->assertSame(1, substr_count($output, ' WARN '), $output);
        $this->assertStringContainsString('TRUSTED_PROXIES', $output);
        $this->assertStringContainsString('X-Forwarded-For present but TRUSTED_PROXIES is not set', $output);
    }

    public function test_no_forwarded_headers_and_no_trusted_proxies_is_fine_for_a_directly_reached_server(): void
    {
        config(['trustedproxy.proxies' => []]);

        [$exit, $output] = $this->preflight();

        $this->assertSame(0, $exit, $output);
        $this->assertStringContainsString('not set: correct when the application is reached directly', $output);
        $this->assertStringNotContainsString(' WARN ', $output);
    }

    public function test_configured_trusted_proxies_are_listed_and_silence_the_warning(): void
    {
        config(['trustedproxy.proxies' => ['10.0.0.5', '172.16.0.0/12']]);
        $_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https';

        try {
            [$exit, $output] = $this->preflight();
        } finally {
            unset($_SERVER['HTTP_X_FORWARDED_PROTO']);
        }

        $this->assertSame(0, $exit, $output);
        $this->assertStringContainsString('10.0.0.5, 172.16.0.0/12', $output);
        $this->assertStringNotContainsString(' WARN ', $output);
    }

    public function test_trusting_every_host_is_reported_with_its_condition(): void
    {
        config(['trustedproxy.proxies' => '*']);

        [$exit, $output] = $this->preflight();

        $this->assertSame(0, $exit, $output);
        $this->assertStringContainsString('only safe when the network stops clients reaching the application directly', $output);
    }

    public function test_the_contact_email_setting_satisfies_the_enquiry_recipient_check(): void
    {
        config(['gallery.enquiry_notification_email' => null]);
        SiteSetting::query()->create(['key' => 'contact_email', 'value' => 'info@example.org', 'type' => 'string']);

        [, $output] = $this->preflight();

        $this->assertStringContainsString('contact_email site setting set', $output);
        $this->assertStringNotContainsString(' WARN ', $output);
    }

    public function test_the_production_environment_template_satisfies_the_checks_it_documents(): void
    {
        $template = Dotenv::parse((string) file_get_contents(base_path('.env.production.example')));

        $this->assertSame('production', $template['APP_ENV']);
        $this->assertSame('false', $template['APP_DEBUG']);
        $this->assertStringStartsWith('https://', $template['APP_URL']);
        $this->assertSame('true', $template['SESSION_SECURE_COOKIE']);
        $this->assertNotContains($template['LOG_LEVEL'], ['debug']);
        $this->assertSame('daily', $template['LOG_STACK']);
        $this->assertNotContains($template['MAIL_MAILER'], ['log', 'array']);
        $this->assertNotContains($template['CACHE_STORE'], ['array', 'null']);
        $this->assertSame('file', $template['CACHE_LIMITER_STORE'], 'the limiter must not cost SQL on the default deployment');
        $this->assertSame('60', $template['RATE_LIMIT_PUBLIC_API']);
        $this->assertNotContains($template['SESSION_DRIVER'], ['array', 'null']);
        $this->assertSame('', $template['PUBLIC_API_CORS_ORIGINS'], 'same-origin: no CORS origins by default');
        $this->assertSame('false', $template['PUBLIC_API_CORS_ALLOW_POST']);
        $this->assertSame('', $template['TRUSTED_PROXIES'], 'no proxy is trusted unless the operator names it');

        foreach (array_keys($template) as $key) {
            $this->assertStringStartsNotWith('ADMIN_DEV_', $key, 'the dev administrator must never be configured in production');
        }
    }

    public function test_the_production_environment_template_contains_no_secrets(): void
    {
        $template = Dotenv::parse((string) file_get_contents(base_path('.env.production.example')));

        foreach ($template as $key => $value) {
            if (preg_match('/(PASSWORD|SECRET|_KEY|TOKEN)$/', $key)) {
                $this->assertContains(strtolower((string) $value), ['', 'change-me'], "{$key} must be empty or a placeholder in a committed template");
            }
        }
    }
}
