<?php

/*
| Caching of the public site's read-only content (Phase 12, P-03).
|
| Two layers, both invalidated by the same content version (App\Support\Cache\PublicContentCache):
|   1. HTTP validators on every public API GET (App\Http\Middleware\PublicApiCacheHeaders): Cache-Control + a strong
|      ETag, so browsers and shared caches reuse a response for `api_ttl` seconds and revalidate cheaply after that.
|   2. Application caching of the few payloads that are expensive and identical for everyone (site settings,
|      navigation, the homepage payload, the sitemap), stored in the default cache store.
| Every successful admin write bumps the content version, so an edit is visible in the application layer at once
| and in HTTP caches within `api_ttl` seconds. Nothing per-user, no admin response and no write is ever cached.
*/
return [

    /*
    | Public API Cache-Control max-age, in seconds. 0 turns the HTTP caching headers (and 304 handling) off.
    | Unset, empty or not a number means 60. This is also the longest an edit can stay invisible to a browser or CDN.
    */
    'api_ttl' => is_numeric($apiTtl = env('PUBLIC_API_CACHE_TTL', 60)) ? max(0, (int) $apiTtl) : 60,

    /*
    | stale-while-revalidate, in seconds: how long after max-age a cache may keep serving the old response while it
    | refetches in the background. 0 (the default) omits the directive, so a response is never served stale for longer
    | than api_ttl; raise it only if the extra staleness is acceptable (the design spec suggests 120).
    */
    'api_stale_while_revalidate' => is_numeric($swr = env('PUBLIC_API_CACHE_SWR', 0)) ? max(0, (int) $swr) : 0,

    /*
    | Application cache lifetimes in seconds. An admin write invalidates them at once (content version); the TTL is
    | the bound for changes made outside the admin (seeders, tinker, SQL), which `php artisan public-cache:flush`
    | makes visible immediately. It also bounds anything that changes with the clock rather than with an edit: an
    | article scheduled for a future published_at appears in the sitemap within `sitemap` seconds of that time (the
    | article endpoints themselves are not application-cached, so the API shows it at once).
    */
    'ttl' => [
        'site_settings' => 300,
        'navigation' => 300,
        'homepage' => 60,
        'sitemap' => 600,
    ],

];
