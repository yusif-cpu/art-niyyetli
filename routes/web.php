<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Serves the admin SPA shell. Internal navigation is client-side (hash-based),
// so this single exact route never collides with the JSON API routes
// registered under /admin/... by admin.php below.
Route::get('/admin', function () {
    return view('admin');
})->name('admin.app');

require __DIR__.'/admin.php';
