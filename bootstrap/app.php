<?php

use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // No web login page exists yet (backend-only phase); unauthenticated
        // admin requests always get a JSON 401 via shouldRenderJsonWhen below
        // rather than a redirect to a route that doesn't exist.
        $middleware->redirectGuestsTo(fn () => null);

        // Outermost global middleware, so the security headers also reach responses that other global
        // middleware short-circuit (CORS preflights, oversized request bodies) and error responses.
        $middleware->prepend(SecurityHeaders::class);

        // Which proxies are trusted comes from config/trustedproxy.php (TRUSTED_PROXIES), read at request time —
        // .env is not loaded yet when this callback runs. Only these forwarded headers are ever honoured; the
        // framework default would also trust X-Forwarded-Prefix and the AWS ELB header, which this app has no use for.
        $middleware->trustProxies(headers: Request::HEADER_X_FORWARDED_FOR
            | Request::HEADER_X_FORWARDED_HOST
            | Request::HEADER_X_FORWARDED_PORT
            | Request::HEADER_X_FORWARDED_PROTO);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->is('admin/*') || $request->expectsJson(),
        );
    })->create();
