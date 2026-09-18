<?php

use App\Enums\Locale;
use App\Http\Controllers\RobotsController;
use App\Services\Seo\PublicPageSeoResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Renders the public SPA shell with server-computed <head> metadata for the
// requested path — this is what makes crawlers/social-link-preview bots (which
// generally do not run the SPA's JavaScript) see correct, entity-specific
// metadata on a hard load or shared link. See docs/superpowers/plans/2026-09-18-phase-11-seo.md.
$renderPublicShell = function (Request $request, PublicPageSeoResolver $resolver, string $path = '') {
    $segments = array_values(array_filter(explode('/', $path)));
    $locale = Locale::tryFrom((string) $request->query('locale')) ?? Locale::Az;
    $seo = $resolver->resolve($segments, $locale);

    return response()->view('public', ['seo' => $seo], $seo->httpStatus);
};

Route::get('/', $renderPublicShell);

// Serves the admin SPA shell. Internal navigation is client-side (hash-based),
// so this single exact route never collides with the JSON API routes
// registered under /admin/... by admin.php below.
Route::get('/admin', function () {
    return view('admin');
})->name('admin.app');

require __DIR__.'/admin.php';

Route::get('/robots.txt', [RobotsController::class, 'index']);

// Serves the public SPA shell for any client-side route (e.g. /artworks/AN-2026-014)
// so a hard refresh/deep link works. Registered last, after /admin and admin.php's
// routes, and the regex excludes both the admin and api prefixes so an undefined
// /admin/* or /api/* path still gets Laravel's normal 404 handling instead of
// silently rendering the public shell.
Route::get('/{any}', $renderPublicShell)->where('any', '^(?!admin|api).*$');
