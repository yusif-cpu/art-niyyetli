<?php

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'HEAD', 'OPTIONS'],

    // Dev localhost origins by default; production sets PUBLIC_API_CORS_ORIGINS
    // in its own .env to the real frontend origin(s) — never a wildcard default.
    'allowed_origins' => array_filter(array_map('trim', explode(',', env(
        'PUBLIC_API_CORS_ORIGINS',
        'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173'
    )))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
