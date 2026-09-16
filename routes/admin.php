<?php

use App\Http\Controllers\Admin\ArticleController;
use App\Http\Controllers\Admin\ArtworkController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EnquiryController;
use App\Http\Controllers\Admin\ExhibitionController;
use App\Http\Controllers\Admin\FaqController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\Admin\PageController;
use App\Http\Controllers\Admin\PageSectionController;
use App\Http\Controllers\Admin\SiteSettingController;
use App\Http\Controllers\Admin\SocialLinkController;
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

            Route::apiResource('exhibitions', ExhibitionController::class)->except(['create', 'edit']);

            Route::apiResource('articles', ArticleController::class)->except(['create', 'edit']);

            Route::post('media', [MediaController::class, 'store'])
                ->name('media.store')
                ->middleware('throttle:media-upload');
            Route::get('media', [MediaController::class, 'index'])->name('media.index');
            Route::get('media/{media}', [MediaController::class, 'show'])->name('media.show');
            Route::match(['put', 'patch'], 'media/{media}', [MediaController::class, 'update'])->name('media.update');
            Route::delete('media/{media}', [MediaController::class, 'destroy'])->name('media.destroy');

            Route::apiResource('pages', PageController::class)->only(['index', 'show', 'store', 'update']);

            Route::get('pages/{page}/sections', [PageSectionController::class, 'index'])->name('pages.sections.index');
            Route::post('pages/{page}/sections', [PageSectionController::class, 'store'])->name('pages.sections.store');
            Route::post('pages/{page}/sections/reorder', [PageSectionController::class, 'reorder'])->name('pages.sections.reorder');
            Route::match(['put', 'patch'], 'pages/sections/{section}', [PageSectionController::class, 'update'])->name('pages.sections.update');

            Route::post('faqs/reorder', [FaqController::class, 'reorder'])->name('faqs.reorder');
            Route::apiResource('faqs', FaqController::class)->except(['create', 'edit']);

            Route::get('settings', [SiteSettingController::class, 'index'])->name('settings.index');
            Route::put('settings', [SiteSettingController::class, 'update'])->name('settings.update');

            Route::post('social-links/reorder', [SocialLinkController::class, 'reorder'])->name('social-links.reorder');
            Route::apiResource('social-links', SocialLinkController::class)->except(['create', 'edit']);

            Route::apiResource('enquiries', EnquiryController::class)->only(['index', 'show', 'update']);

            Route::middleware('can:admin.manage-users')->group(function () {
                Route::get('users', [UserManagementController::class, 'index'])->name('users.index');
            });
        });
    });
});
