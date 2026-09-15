<?php

use App\Http\Controllers\Admin\ArtworkController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\Admin\UserManagementController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->name('admin.')->group(function () {
    Route::post('login', [AuthController::class, 'store'])->name('login');

    Route::middleware('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'destroy'])->name('logout');

        Route::middleware('can:admin.access')->group(function () {
            Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

            Route::post('artworks/reorder', [ArtworkController::class, 'reorder'])->name('artworks.reorder');
            Route::apiResource('artworks', ArtworkController::class)->except(['create', 'edit']);

            Route::post('media', [MediaController::class, 'store'])
                ->name('media.store')
                ->middleware('throttle:media-upload');
            Route::get('media', [MediaController::class, 'index'])->name('media.index');
            Route::get('media/{media}', [MediaController::class, 'show'])->name('media.show');
            Route::match(['put', 'patch'], 'media/{media}', [MediaController::class, 'update'])->name('media.update');
            Route::delete('media/{media}', [MediaController::class, 'destroy'])->name('media.destroy');

            Route::middleware('can:admin.manage-users')->group(function () {
                Route::get('users', [UserManagementController::class, 'index'])->name('users.index');
            });
        });
    });
});
