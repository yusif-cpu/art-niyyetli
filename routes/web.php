<?php

use App\Enums\Locale;
use App\Http\Controllers\RobotsController;
use App\Http\Controllers\SitemapController;
use App\Services\Seo\PublicPageSeoResolver;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

// The session stack of the `web` group. Anonymous public HTML (the SPA shell, robots.txt, sitemap.xml)
// has no per-user state — the SPA talks to the token-free /api/v1 and public.blade.php uses no
// @csrf/old()/$errors — so these routes opt out: no session row, no Set-Cookie, and therefore a
// response a browser or shared cache may keep. Admin routes stay in the full `web` group (the admin
// SPA depends on the session and the XSRF-TOKEN cookie); a future public page that needs CSRF or
// flash data has to opt back in explicitly.
$withoutSession = [
    StartSession::class,
    ShareErrorsFromSession::class,
    PreventRequestForgery::class,
    EncryptCookies::class,
    AddQueuedCookiesToResponse::class,
];

// Renders the public SPA shell with server-computed <head> metadata for the
// requested path — this is what makes crawlers/social-link-preview bots (which
// generally do not run the SPA's JavaScript) see correct, entity-specific
// metadata on a hard load or shared link. See docs/superpowers/plans/2026-09-18-phase-11-seo.md.
//
// The response is cacheable but always revalidated: the weak ETag is a hash of the rendered document,
// so it changes whenever anything in it changes — the SEO <head> values as well as the hashed Vite
// asset URLs after a deploy — and a matching If-None-Match gets a body-less 304.
$renderPublicShell = function (Request $request, PublicPageSeoResolver $resolver, string $path = '') {
    $segments = array_values(array_filter(explode('/', $path)));
    $locale = Locale::tryFrom((string) $request->query('locale')) ?? Locale::Az;
    $seo = $resolver->resolve($segments, $locale);

    $response = response()->view('public', ['seo' => $seo], $seo->httpStatus)
        ->header('Cache-Control', 'public, max-age=0, must-revalidate');
    $response->setEtag(md5($response->getContent()), true);
    $response->isNotModified($request);

    return $response;
};

Route::get('/', $renderPublicShell)->withoutMiddleware($withoutSession);

// Serves the admin SPA shell. Internal navigation is client-side (hash-based),
// so this single exact route never collides with the JSON API routes
// registered under /admin/... by admin.php below.
Route::get('/admin', function () {
    return view('admin');
})->name('admin.app');

require __DIR__.'/admin.php';

Route::get('/robots.txt', [RobotsController::class, 'index'])->withoutMiddleware($withoutSession);
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->withoutMiddleware($withoutSession);

// Serves the public SPA shell for any client-side route (e.g. /artworks/AN-2026-014)
// so a hard refresh/deep link works. Registered last, after /admin and admin.php's
// routes, and the regex excludes both the admin and api prefixes so an undefined
// /admin/* or /api/* path still gets Laravel's normal 404 handling instead of
// silently rendering the public shell.
Route::get('/{any}', $renderPublicShell)->where('any', '^(?!admin|api).*$')->withoutMiddleware($withoutSession);
