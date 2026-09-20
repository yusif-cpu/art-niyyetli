<?php

namespace App\Console\Commands;

use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Console\Command;
use Throwable;

class PreflightCommand extends Command
{
    protected $signature = 'app:preflight {--strict : Exit non-zero on any failed check, whatever APP_ENV is}';

    protected $description = 'Check the environment configuration for production readiness';

    private const PASS = 'pass';

    private const WARN = 'warn';

    private const FAIL = 'fail';

    /** Hosts that mean "this machine" — never valid for a public APP_URL or CORS origin. */
    private const LOCAL_HOSTS = ['', 'localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'];

    public function handle(): int
    {
        $enforced = $this->option('strict') || $this->laravel->environment('production');
        $counts = [self::PASS => 0, self::WARN => 0, self::FAIL => 0];

        foreach ($this->results() as [$status, $name, $detail]) {
            $counts[$status]++;

            $label = match ($status) {
                self::PASS => '<fg=green>PASS</>',
                self::WARN => '<fg=yellow>WARN</>',
                self::FAIL => '<fg=red>FAIL</>',
            };

            $this->line(sprintf(' %s  %-24s %s', $label, $name, $detail));
        }

        $this->newLine();
        $this->line(sprintf('%d passed, %d warning(s), %d failed.', $counts[self::PASS], $counts[self::WARN], $counts[self::FAIL]));

        if ($counts[self::FAIL] === 0) {
            $this->info('Preflight passed.');

            return self::SUCCESS;
        }

        if (! $enforced) {
            $this->warn('Failures are not enforced because APP_ENV is not "production" (use --strict to enforce them).');

            return self::SUCCESS;
        }

        $this->error('Preflight failed: fix the checks above before deploying.');

        return self::FAILURE;
    }

    /** @return array<int, array{0: string, 1: string, 2: string}> [status, check, detail] */
    private function results(): array
    {
        return [
            $this->environment(),
            $this->debug(),
            $this->appKey(),
            $this->appUrl(),
            $this->secureCookie(),
            $this->sessionDriver(),
            $this->logLevel(),
            $this->logRotation(),
            $this->mailer(),
            $this->cacheStore(),
            $this->limiterStore(),
            $this->corsOrigins(),
            $this->trustedProxies(),
            $this->storageLink(),
            $this->frontendBuild(),
            $this->testAccount(),
            $this->notificationRecipient(),
        ];
    }

    private function environment(): array
    {
        $env = $this->laravel->environment();

        return $env === 'production'
            ? [self::PASS, 'APP_ENV', 'production']
            : [self::FAIL, 'APP_ENV', "is \"{$env}\"; production must run with APP_ENV=production"];
    }

    private function debug(): array
    {
        return config('app.debug') === true
            ? [self::FAIL, 'APP_DEBUG', 'is true: error pages would expose stack traces, file paths and configuration']
            : [self::PASS, 'APP_DEBUG', 'false'];
    }

    private function appKey(): array
    {
        return filled(config('app.key'))
            ? [self::PASS, 'APP_KEY', 'set']
            : [self::FAIL, 'APP_KEY', 'is empty: run `php artisan key:generate` (sessions and cookies cannot be encrypted without it)'];
    }

    private function appUrl(): array
    {
        $url = (string) config('app.url');
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        if (in_array($host, self::LOCAL_HOSTS, true)) {
            return [self::FAIL, 'APP_URL', "\"{$url}\" is a local address; it drives canonical URLs, the sitemap, emails and every media URL"];
        }

        return $scheme === 'https'
            ? [self::PASS, 'APP_URL', $url]
            : [self::FAIL, 'APP_URL', "\"{$url}\" is not https"];
    }

    private function secureCookie(): array
    {
        return config('session.secure') === true
            ? [self::PASS, 'SESSION_SECURE_COOKIE', 'true']
            : [self::FAIL, 'SESSION_SECURE_COOKIE', 'is not true: the admin session cookie could be sent over plain HTTP'];
    }

    private function sessionDriver(): array
    {
        $driver = (string) config('session.driver');

        return in_array($driver, ['array', 'null'], true)
            ? [self::FAIL, 'SESSION_DRIVER', "\"{$driver}\" keeps no session between requests"]
            : [self::PASS, 'SESSION_DRIVER', $driver];
    }

    private function logLevel(): array
    {
        $verbose = array_values(array_filter(
            $this->logChannels(),
            fn (string $channel) => config("logging.channels.{$channel}.level") === 'debug'
        ));

        return $verbose === []
            ? [self::PASS, 'LOG_LEVEL', 'not debug']
            : [self::FAIL, 'LOG_LEVEL', 'is debug on ['.implode(', ', $verbose).']: use warning or error in production'];
    }

    private function logRotation(): array
    {
        return in_array('single', $this->logChannels(), true)
            ? [self::WARN, 'LOG_STACK', '"single" writes one unbounded log file; use "daily"']
            : [self::PASS, 'LOG_STACK', 'rotating or external channel'];
    }

    private function mailer(): array
    {
        $mailer = (string) config('mail.default');

        return in_array($mailer, ['log', 'array'], true)
            ? [self::FAIL, 'MAIL_MAILER', "\"{$mailer}\" never delivers: enquiry notifications and replies would be silently lost"]
            : [self::PASS, 'MAIL_MAILER', $mailer];
    }

    private function cacheStore(): array
    {
        $store = (string) config('cache.default');

        if (in_array($store, ['array', 'null'], true)) {
            return [self::FAIL, 'CACHE_STORE', "\"{$store}\" is not shared between requests"];
        }

        return $store === 'database'
            ? [self::WARN, 'CACHE_STORE', '"database" adds SQL to every cache read and rate-limit check under load']
            : [self::PASS, 'CACHE_STORE', $store];
    }

    private function limiterStore(): array
    {
        $store = (string) (config('cache.limiter') ?? config('cache.default'));

        return in_array($store, ['array', 'null'], true)
            ? [self::FAIL, 'Rate limiter store', "\"{$store}\" is not shared between requests, so rate limits would not apply"]
            : [self::PASS, 'Rate limiter store', $store];
    }

    private function corsOrigins(): array
    {
        $local = array_values(array_filter(
            (array) config('cors.allowed_origins', []),
            fn ($origin) => in_array(strtolower((string) parse_url((string) $origin, PHP_URL_HOST)), self::LOCAL_HOSTS, true)
        ));

        return $local === []
            ? [self::PASS, 'PUBLIC_API_CORS_ORIGINS', 'no local origins']
            : [self::FAIL, 'PUBLIC_API_CORS_ORIGINS', 'allows local or malformed origin(s): '.implode(', ', $local)];
    }

    private function trustedProxies(): array
    {
        $configured = config('trustedproxy.proxies');

        if ($configured === '*') {
            return [self::PASS, 'TRUSTED_PROXIES', '"*" trusts every connecting host: only safe when the network stops clients reaching the application directly'];
        }

        if (is_array($configured) && $configured !== []) {
            return [self::PASS, 'TRUSTED_PROXIES', implode(', ', $configured)];
        }

        $forwarded = array_values(array_filter(
            ['X-Forwarded-For', 'X-Forwarded-Proto', 'X-Forwarded-Host', 'X-Forwarded-Port'],
            fn (string $header) => isset($_SERVER['HTTP_'.strtoupper(str_replace('-', '_', $header))])
        ));

        return $forwarded === []
            ? [self::PASS, 'TRUSTED_PROXIES', 'not set: correct when the application is reached directly, with no proxy in front']
            : [self::WARN, 'TRUSTED_PROXIES', implode(', ', $forwarded).' present but TRUSTED_PROXIES is not set: behind a proxy or load balancer every visitor would share one rate-limit bucket and HTTPS would be misdetected'];
    }

    private function storageLink(): array
    {
        return file_exists(public_path('storage'))
            ? [self::PASS, 'public/storage', 'present']
            : [self::FAIL, 'public/storage', 'is missing: run `php artisan storage:link` (uploaded images would 404)'];
    }

    private function frontendBuild(): array
    {
        return file_exists(public_path('build/manifest.json'))
            ? [self::PASS, 'Frontend build', 'manifest present']
            : [self::FAIL, 'Frontend build', 'public/build/manifest.json is missing: run `npm run build`'];
    }

    private function testAccount(): array
    {
        try {
            $exists = User::query()->where('email', 'test@example.com')->exists();
        } catch (Throwable) {
            return [self::WARN, 'Seeded test account', 'not checked: the database is unavailable'];
        }

        return $exists
            ? [self::FAIL, 'Seeded test account', 'test@example.com exists (created by an old `db:seed` with a known password): delete it or change its password']
            : [self::PASS, 'Seeded test account', 'absent'];
    }

    private function notificationRecipient(): array
    {
        if (filled(config('gallery.enquiry_notification_email'))) {
            return [self::PASS, 'Enquiry recipient', 'ENQUIRY_NOTIFICATION_EMAIL set'];
        }

        try {
            if (filled(SiteSetting::query()->where('key', 'contact_email')->value('value'))) {
                return [self::PASS, 'Enquiry recipient', 'contact_email site setting set'];
            }
        } catch (Throwable) {
            return [self::WARN, 'Enquiry recipient', 'not checked: the database is unavailable'];
        }

        return [self::WARN, 'Enquiry recipient', 'neither ENQUIRY_NOTIFICATION_EMAIL nor the contact_email setting is set: new enquiries would not be emailed'];
    }

    /** @return array<int, string> the log channels the default channel writes to */
    private function logChannels(): array
    {
        $default = (string) config('logging.default');
        $channel = (array) config("logging.channels.{$default}");

        return ($channel['driver'] ?? null) === 'stack' ? array_values((array) ($channel['channels'] ?? [])) : [$default];
    }
}
