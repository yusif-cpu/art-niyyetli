<?php

use App\Http\Controllers\Admin\ArtworkController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
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

            Route::middleware('can:admin.manage-users')->group(function () {
                Route::get('users', [UserManagementController::class, 'index'])->name('users.index');
            });
        });
    });
});
