<?php

/*
| Cross-origin access to the public API. The SPA is served from the same origin as the API (the approved
| deployment), so no cross-origin access is needed or granted by default in production; same-origin requests
| never involve CORS at all.
*/
return [

    'paths' => ['api/*'],

    // The API is read-only apart from the enquiry form. POST is granted cross-origin only when a separately
    // hosted frontend must submit enquiries: set PUBLIC_API_CORS_ALLOW_POST=true (and its origin below).
    'allowed_methods' => array_values(array_filter([
        'GET',
        'HEAD',
        'OPTIONS',
        env('PUBLIC_API_CORS_ALLOW_POST', false) ? 'POST' : null,
    ])),

    // Comma-separated exact origins in PUBLIC_API_CORS_ORIGINS — never a wildcard. When the variable is not set
    // at all: no origins in production, and the usual local dev-server origins everywhere else. Setting it to an
    // empty value means "none" in every environment.
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'PUBLIC_API_CORS_ORIGINS',
        env('APP_ENV', 'production') === 'production'
            ? ''
            : 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173'
    ))))),

    'allowed_origins_patterns' => [],

    // Exactly what the public frontend sends (a JSON body needs Content-Type). No credentials or custom
    // headers are ever allowed cross-origin.
    'allowed_headers' => ['Accept', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => [],

    // Browsers may cache a preflight result for ten minutes instead of repeating it before every request.
    'max_age' => 600,

    'supports_credentials' => false,

];
