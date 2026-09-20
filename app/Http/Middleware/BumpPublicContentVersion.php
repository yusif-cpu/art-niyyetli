<?php

namespace App\Http\Middleware;

use App\Support\Cache\PublicContentCache;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Invalidates the public content cache after every admin write that succeeded or may have partly succeeded.
 *
 * Attached to the admin route group, per request rather than per model event, so it covers everything an edit does:
 * model events, pivot sync()/attach() calls (which fire none), bulk update()s and file changes alike, and a new admin
 * route is covered automatically. A 2xx is a committed write; a 5xx or an exception may have committed part of one
 * before failing, so those bump too. A 4xx (validation, authorisation, a refused delete) is rejected before anything is
 * written and does not.
 *
 * The bump happens before the response is returned, so the application cache (site settings, navigation, homepage,
 * sitemap) never serves the old content after the admin has saved. Browsers and shared caches may still reuse an
 * earlier public API response for up to PUBLIC_API_CACHE_TTL seconds (config/public_cache.php).
 */
class BumpPublicContentVersion
{
    private const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function __construct(private PublicContentCache $cache) {}

    public function handle(Request $request, Closure $next): Response
    {
        $isWrite = in_array($request->method(), self::WRITE_METHODS, true);

        try {
            $response = $next($request);
        } catch (Throwable $e) {
            if ($isWrite) {
                $this->cache->bump();
            }

            throw $e;
        }

        if ($isWrite && ($response->isSuccessful() || $response->getStatusCode() >= 500)) {
            $this->cache->bump();
        }

        return $response;
    }
}
