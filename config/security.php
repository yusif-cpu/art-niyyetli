<?php

/*
| HTTP response security headers, applied to every response by
| App\Http\Middleware\SecurityHeaders (which never overrides a header a response already sets).
*/
return [

    /*
    | Static headers sent on every response. Set a value to null or '' to stop sending that header.
    | X-Frame-Options and X-Content-Type-Options used to be set by nginx; the application owns them now
    | so they are identical whatever serves it and are also present on error responses.
    */
    'headers' => [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'SAMEORIGIN',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        'Cross-Origin-Opener-Policy' => 'same-origin',
    ],

    /*
    | Strict-Transport-Security. Sent only on HTTPS requests and only when enabled: browsers remember the
    | policy for max_age seconds, so enable it once the whole site is confirmed to work over HTTPS.
    | No includeSubDomains / preload — those are deliberate, separate decisions.
    */
    'hsts' => [
        'enabled' => (bool) env('SECURITY_HSTS', false),
        'max_age' => 31536000,
    ],

    /*
    | Content-Security-Policy.
    |   mode:       off | report-only | enforce. Anything else is treated as report-only (a typo must never
    |               silently enforce, or silently disable, the policy). The default is report-only: it is what local
    |               development runs (new resources show up as "[Report Only]" console messages), while
    |               .env.production.example sets "enforce" for the policy reviewed clean in Phase 12.
    |   report_uri: optional URL that receives violation reports (added as a report-uri directive).
    | The policy itself lives in SecurityHeaders::policy(). It is skipped while the Vite dev server is
    | running (public/hot exists), which needs inline and HMR allowances.
    */
    'csp' => [
        'mode' => env('SECURITY_CSP', 'report-only'),
        'report_uri' => env('SECURITY_CSP_REPORT_URI'),
    ],

    /*
    | Request rate limits, registered in AppServiceProvider (the counters live in the cache.limiter store).
    |   public_api:   requests per minute per client IP across the read-only /api/v1 endpoints.
    |   enquiry:      enquiry form submissions per hour per client IP, on top of public_api. Deliberately not
    |                 an environment setting: it is the spam protection for the only public write endpoint.
    |   media_upload: uploads per minute per admin user.
    |   admin_api:    admin write requests (POST/PUT/PATCH/DELETE) per minute per admin user; reads are not counted.
    | The two tunable limits fall back to their default when the variable is empty, zero or not a number.
    */
    'rate_limits' => [
        'public_api' => max(0, (int) env('RATE_LIMIT_PUBLIC_API', 60)) ?: 60,
        'enquiry' => 5,
        'media_upload' => 20,
        'admin_api' => max(0, (int) env('RATE_LIMIT_ADMIN_API', 240)) ?: 240,
    ],

];
