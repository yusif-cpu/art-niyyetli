<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Adds the response security headers configured in config/security.php to every response
 * (web, API and error responses alike). A header a response already carries is never replaced,
 * so an individual route can opt out or supply its own value.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        foreach ((array) config('security.headers') as $name => $value) {
            if (filled($value)) {
                $this->setIfMissing($response, $name, (string) $value);
            }
        }

        if ($request->isSecure() && config('security.hsts.enabled')) {
            $this->setIfMissing($response, 'Strict-Transport-Security', 'max-age='.(int) config('security.hsts.max_age'));
        }

        $this->applyContentSecurityPolicy($response);

        return $response;
    }

    private function applyContentSecurityPolicy(Response $response): void
    {
        $mode = config('security.csp.mode');

        if ($mode === 'off' || $this->viteDevServerIsRunning()) {
            return;
        }

        if ($response->headers->has('Content-Security-Policy') || $response->headers->has('Content-Security-Policy-Report-Only')) {
            return;
        }

        $enforce = $mode === 'enforce';

        $response->headers->set(
            $enforce ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
            $this->policy($enforce)
        );
    }

    /**
     * Every source is justified by what the built site actually loads: the Vite bundles (script-src,
     * style-src), self-hosted fonts, same-origin fetch calls to /api and /admin (connect-src), media
     * variants served from the public disk (img-src) and YouTube embeds (frame-src). The JSON-LD block
     * in the public shell is a data block, not governed by script-src.
     */
    private function policy(bool $enforce): string
    {
        $directives = [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self'",
            'img-src '.implode(' ', array_filter(["'self'", 'data:', $this->mediaOrigin()])),
            "font-src 'self'",
            "connect-src 'self'",
            'frame-src https://www.youtube-nocookie.com',
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
        ];

        // Browsers ignore frame-ancestors in a report-only policy (with a console warning), so it is only
        // sent when enforcing; X-Frame-Options already covers clickjacking in the meantime.
        if ($enforce) {
            $directives[] = "frame-ancestors 'self'";
        }

        $reportUri = config('security.csp.report_uri');

        if (is_string($reportUri) && preg_match('#^(https?://|/)[^\s;,]+$#', $reportUri) === 1) {
            $directives[] = 'report-uri '.$reportUri;
        }

        return implode('; ', $directives);
    }

    /** The origin media variant URLs are served from, so a CDN/object-storage disk keeps working. */
    private function mediaOrigin(): ?string
    {
        try {
            $parts = parse_url(Storage::disk(config('media.disks.public'))->url(''));
        } catch (Throwable) {
            return null;
        }

        if (! is_array($parts) || ! isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        return $parts['scheme'].'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : '');
    }

    private function viteDevServerIsRunning(): bool
    {
        return is_file(public_path('hot'));
    }

    private function setIfMissing(Response $response, string $name, string $value): void
    {
        if (! $response->headers->has($name)) {
            $response->headers->set($name, $value);
        }
    }
}
