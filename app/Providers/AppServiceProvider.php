<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
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
        // Surfaces N+1 regressions early: lazy-loading a relation on a model that came
        // from a multi-row result is logged as a warning in every non-production
        // environment (the test suite upgrades it to an exception in Tests\TestCase).
        // It is never enabled in production, so a missed eager load there degrades to
        // an extra query, not an error.
        Model::preventLazyLoading(! $this->app->environment('production'));
        Model::handleLazyLoadingViolationUsing(function (Model $model, string $relation): void {
            Log::warning(sprintf('Lazy loading [%s] on model [%s].', $relation, $model::class));
        });

        Gate::define('admin.access', fn (User $user) => $user->is_active && ($user->hasRole('administrator') || $user->hasRole('editor')));

        Gate::define('admin.manage-users', fn (User $user) => $user->is_active && $user->hasRole('administrator'));

        // Separate from the login limiter (5/min per username+IP in
        // AuthController). 20/minute per admin user comfortably covers a
        // multi-image artwork-entry session while blocking scripted abuse.
        RateLimiter::for('media-upload', fn (Request $request) => Limit::perMinute(20)->by(
            $request->user()?->id ?: $request->ip()
        ));

        // Public read-only API. 60/min/IP is generous for a browsing frontend
        // while blocking scripted scraping/abuse; Phase 12 can tune further.
        RateLimiter::for('public-api', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));

        // The only public write endpoint (enquiry submission). Much stricter
        // than the general read limit to blunt scripted spam per Phase 10 §11.
        RateLimiter::for('enquiry-submission', fn (Request $request) => Limit::perHour(5)->by($request->ip()));
    }
}
