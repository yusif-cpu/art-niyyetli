<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('admin.access', fn (User $user) => $user->hasRole('administrator') || $user->hasRole('editor'));

        Gate::define('admin.manage-users', fn (User $user) => $user->hasRole('administrator'));

        // Separate from the login limiter (5/min per username+IP in
        // AuthController). 20/minute per admin user comfortably covers a
        // multi-image artwork-entry session while blocking scripted abuse.
        RateLimiter::for('media-upload', fn (Request $request) => Limit::perMinute(20)->by(
            $request->user()?->id ?: $request->ip()
        ));

        // Public read-only API. 60/min/IP is generous for a browsing frontend
        // while blocking scripted scraping/abuse; Phase 12 can tune further.
        RateLimiter::for('public-api', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
    }
}
