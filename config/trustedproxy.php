<?php

/*
| Reverse proxies / load balancers whose X-Forwarded-For, -Proto, -Host and -Port headers are trusted, so the
| application sees the real client IP (rate limiting, login throttling, logs) and the real scheme (HTTPS
| detection, HSTS, secure cookies) when it sits behind one.
|
| This is read at request time by Illuminate\Http\Middleware\TrustProxies (config('trustedproxy.proxies')). It is
| deliberately a config file and not an env() call in bootstrap/app.php: the middleware callback there runs
| BEFORE .env is loaded, so a value set in .env would be silently ignored.
|
| TRUSTED_PROXIES is a comma-separated list of proxy IP addresses or CIDR ranges, for example
| "10.0.0.5,172.16.0.0/12". The token REMOTE_ADDR trusts whichever host connects directly. "*" trusts every
| connecting host: only use it when the network guarantees that only your proxy can reach the application, because
| otherwise any client could forge its own IP address and defeat every IP-based rate limit.
|
| Leave it EMPTY when the application is reached directly, with nothing in front of it (the default, and the local
| Docker setup): forwarded headers from clients are then ignored. The empty result is an empty array, never null on
| purpose: when this value is null the framework trusts ALL proxies for any request whose Host header ends in
| ".on-forge.com" or ".on-vapor.com" — a header the client controls — which would let anyone spoof their IP.
*/

$proxies = array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', '')))));

return [

    // The framework only recognises "trust everyone" as the string '*', never as a list entry.
    'proxies' => array_intersect(['*', '**'], $proxies) !== [] ? '*' : $proxies,

];
