<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('public');
});

// Serves the admin SPA shell. Internal navigation is client-side (hash-based),
// so this single exact route never collides with the JSON API routes
// registered under /admin/... by admin.php below.
Route::get('/admin', function () {
    return view('admin');
})->name('admin.app');

require __DIR__.'/admin.php';

// Serves the public SPA shell for any client-side route (e.g. /artworks/AN-2026-014)
// so a hard refresh/deep link works. Registered last, after /admin and admin.php's
// routes, and the regex excludes both the admin and api prefixes so an undefined
// /admin/* or /api/* path still gets Laravel's normal 404 handling instead of
// silently rendering the public shell.
Route::get('/{any}', function () {
    return view('public');
})->where('any', '^(?!admin|api).*$');
