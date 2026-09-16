<?php

use App\Http\Controllers\Api\V1\ArticleController;
use App\Http\Controllers\Api\V1\ArtistController;
use App\Http\Controllers\Api\V1\ArtworkController;
use App\Http\Controllers\Api\V1\ExhibitionController;
use App\Http\Controllers\Api\V1\FaqController;
use App\Http\Controllers\Api\V1\HomepageController;
use App\Http\Controllers\Api\V1\PageController;
use App\Http\Controllers\Api\V1\SiteSettingController;
use App\Http\Controllers\Api\V1\SocialLinkController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('throttle:public-api')->group(function () {
    Route::get('social-links', [SocialLinkController::class, 'index']);
    Route::get('site-settings', [SiteSettingController::class, 'index']);
    Route::get('faqs', [FaqController::class, 'index']);
    Route::get('pages', [PageController::class, 'index']);
    Route::get('pages/{slug}', [PageController::class, 'show']);
    Route::get('artworks', [ArtworkController::class, 'index']);
    Route::get('artworks/{inventoryCode}', [ArtworkController::class, 'show']);
    Route::get('artists', [ArtistController::class, 'index']);
    Route::get('artists/{slug}', [ArtistController::class, 'show']);
    Route::get('exhibitions', [ExhibitionController::class, 'index']);
    Route::get('exhibitions/{slug}', [ExhibitionController::class, 'show']);
    Route::get('articles', [ArticleController::class, 'index']);
    Route::get('articles/{slug}', [ArticleController::class, 'show']);
    Route::get('homepage', [HomepageController::class, 'index']);
});
