<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * HTTP cache validators for the public read-only API: Cache-Control + a strong ETag on successful GET/HEAD
 * responses, and a body-less 304 when the client's If-None-Match matches.
 *
 * Only ever attached to the public GET routes. It refuses anything that is not a plain 200 read (writes, errors,
 * validation failures) and any response that sets a cookie, so an enquiry, an error or a user-specific answer can
 * never be marked shareable. The ETag hashes the final body, so it always reflects exactly what would be sent; the
 * controller still runs on a conditional request (the application cache is what saves the database work).
 */
class PublicApiCacheHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $ttl = (int) config('public_cache.api_ttl');

        if ($ttl <= 0
            || ! $request->isMethodCacheable()
            || $response->getStatusCode() !== Response::HTTP_OK
            || $response->headers->has('Set-Cookie')) {
            return $response;
        }

        $directives = ['public', "max-age={$ttl}"];

        if (($swr = (int) config('public_cache.api_stale_while_revalidate')) > 0) {
            $directives[] = "stale-while-revalidate={$swr}";
        }

        $response->headers->set('Cache-Control', implode(', ', $directives));
        // Appended, not replaced: the CORS layer may already have added `Vary: Origin`. Never `Vary: Cookie`.
        $response->setVary('Accept-Encoding', false);
        $response->setEtag(md5((string) $response->getContent()));
        $response->isNotModified($request);

        return $response;
    }
}
