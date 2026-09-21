<?php

namespace Tests\Feature\Infrastructure;

use Tests\TestCase;

/**
 * A lint of docker/nginx/default.conf and docker/php/conf.d/local.ini, read as text (Phase 12 Task 12). It is not a
 * runtime test — nginx is not started here — so it guards the rules that are easy to break by editing the file and
 * that were each verified against a real nginx: compression scope, immutable caching only for hashed Vite files, the
 * regex-location ordering that keeps uploaded scripts away from PHP-FPM, and that nginx never adds cache headers to
 * anything dynamic (the application owns those: ETags, Cache-Control on the API, no-cache on the admin).
 */
class NginxConfigTest extends TestCase
{
    private string $conf;

    /** @var array<int, array{spec: string, body: string}> the server's location blocks, in file order */
    private array $locations;

    protected function setUp(): void
    {
        parent::setUp();

        $raw = file_get_contents(base_path('docker/nginx/default.conf'));
        $this->assertNotFalse($raw, 'docker/nginx/default.conf must exist.');

        // Comments are documentation; strip them so a directive mentioned in prose is never mistaken for one.
        $this->conf = preg_replace('/^\s*#.*$/m', '', $raw);

        preg_match_all('/location\s+([^{]+?)\s*\{([^}]*)\}/s', $this->conf, $matches, PREG_SET_ORDER);
        $this->locations = array_map(fn (array $m) => ['spec' => trim($m[1]), 'body' => $m[2]], $matches);
    }

    public function test_the_version_is_not_advertised(): void
    {
        $this->assertMatchesRegularExpression('/^\s*server_tokens\s+off;/m', $this->conf);
    }

    public function test_text_responses_are_compressed_and_already_compressed_formats_are_not(): void
    {
        $this->assertMatchesRegularExpression('/^\s*gzip\s+on;/m', $this->conf);
        $this->assertMatchesRegularExpression('/^\s*gzip_vary\s+on;/m', $this->conf, 'Shared caches need Vary: Accept-Encoding.');
        $this->assertMatchesRegularExpression('/^\s*gzip_min_length\s+1024;/m', $this->conf);

        $this->assertSame(1, preg_match('/^\s*gzip_types\s+([^;]+);/m', $this->conf, $m), 'gzip_types must be set.');
        $types = preg_split('/\s+/', trim($m[1]));

        // Both JavaScript types: nginx's mime.types maps .js to application/javascript today and to text/javascript in
        // some builds, and a missing one silently leaves every bundle uncompressed.
        foreach (['text/css', 'text/plain', 'text/javascript', 'application/javascript', 'application/json', 'application/xml', 'image/svg+xml'] as $required) {
            $this->assertContains($required, $types, "{$required} must be compressed.");
        }

        // text/html is always compressed and listing it only makes nginx warn about a duplicate; the binary formats
        // are already compressed, so gzip would only cost CPU.
        foreach (['text/html', 'image/jpeg', 'image/png', 'image/webp', 'font/woff', 'font/woff2'] as $forbidden) {
            $this->assertNotContains($forbidden, $types);
        }

        $this->assertDoesNotMatchRegularExpression('/\bbrotli\b/i', $this->conf, 'Brotli is not in the stock nginx image; it is a Phase 13 edge concern.');
    }

    public function test_hashed_vite_assets_get_one_year_immutable_caching_and_nothing_else_does(): void
    {
        $block = $this->location('/build/assets/');

        $this->assertStringContainsString('add_header Cache-Control "public, max-age=31536000, immutable";', $block);
        $this->assertStringContainsString('try_files $uri =404;', $block, 'A missing asset must be a plain 404, never the SPA shell.');
        $this->assertMatchesRegularExpression('/add_header X-Content-Type-Options "nosniff" always;/', $block);
        $this->assertDoesNotMatchRegularExpression('/Cache-Control[^;]*always/', $block, 'A 404 must never be cached as immutable.');

        // `immutable` exists exactly once, in that block — never for /build/manifest.json, /storage or anything dynamic.
        $this->assertSame(1, substr_count($this->conf, 'immutable'));

        // `expires` would add a second, conflicting Cache-Control line (max-age=…) next to the add_header one.
        $this->assertDoesNotMatchRegularExpression('/^\s*expires\s/m', $this->conf);
    }

    public function test_media_variants_are_cached_for_a_day_and_are_not_immutable(): void
    {
        $block = $this->location('/storage/');

        $this->assertStringContainsString('add_header Cache-Control "public, max-age=86400";', $block);
        $this->assertStringContainsString('try_files $uri =404;', $block);
        $this->assertMatchesRegularExpression('/add_header X-Content-Type-Options "nosniff" always;/', $block);
        $this->assertStringNotContainsString('immutable', $block);
    }

    public function test_scripts_under_storage_are_denied_before_they_can_reach_php_fpm(): void
    {
        $denyIndex = $this->locationIndex('~* ^/storage/.*\.(php|phtml|phar)$');
        $phpIndex = $this->locationIndex('~ \.php$');

        $this->assertStringContainsString('deny all;', $this->locations[$denyIndex]['body']);

        // nginx uses the FIRST matching regex location: below the .php block this rule would never be reached, and a
        // script uploaded to storage/app/public would be executed (verified against a real nginx).
        $this->assertLessThan($phpIndex, $denyIndex, 'The /storage script deny must come before the .php location.');
    }

    public function test_dotfiles_stay_denied_and_static_locations_do_not_bypass_that_rule(): void
    {
        $this->assertStringContainsString('deny all;', $this->location('~ /\.(?!well-known).*'));

        // `^~` would stop nginx checking regex locations, exposing /storage/.gitignore and the like.
        foreach ($this->locations as $location) {
            $this->assertStringNotContainsString('^~', $location['spec'], "location {$location['spec']} must not use ^~.");
        }
    }

    public function test_nginx_never_adds_cache_headers_or_a_response_cache_to_dynamic_content(): void
    {
        // Only the two static locations may set Cache-Control; the SPA shell, admin, API, sitemap and robots.txt all
        // fall through `location /` and `.php` and keep the headers the application gives them.
        $this->assertSame(2, preg_match_all('/add_header\s+Cache-Control/i', $this->conf));

        foreach (['/', '~ \.php$'] as $spec) {
            $this->assertDoesNotMatchRegularExpression('/Cache-Control|expires|fastcgi_cache|proxy_cache/i', $this->location($spec), "location {$spec} must not set caching.");
        }

        $this->assertDoesNotMatchRegularExpression('/^\s*(fastcgi_cache|proxy_cache)\b/m', $this->conf);
    }

    public function test_security_headers_stay_with_the_application(): void
    {
        // App\Http\Middleware\SecurityHeaders owns these; sending them from nginx as well would duplicate each one.
        $this->assertDoesNotMatchRegularExpression('/add_header\s+(X-Frame-Options|Content-Security-Policy|Referrer-Policy|Permissions-Policy|Strict-Transport-Security)/i', $this->conf);
    }

    public function test_the_php_version_banner_is_off(): void
    {
        $ini = file_get_contents(base_path('docker/php/conf.d/local.ini'));

        $this->assertMatchesRegularExpression('/^\s*expose_php\s*=\s*Off\s*$/mi', (string) $ini);
    }

    private function location(string $spec): string
    {
        return $this->locations[$this->locationIndex($spec)]['body'];
    }

    private function locationIndex(string $spec): int
    {
        foreach ($this->locations as $index => $location) {
            if ($location['spec'] === $spec) {
                return $index;
            }
        }

        $this->fail("docker/nginx/default.conf has no `location {$spec}` block.");
    }
}
