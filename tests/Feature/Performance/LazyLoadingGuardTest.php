<?php

namespace Tests\Feature\Performance;

use App\Models\Artwork;
use App\Providers\AppServiceProvider;
use Database\Seeders\BenchmarkSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Tests\TestCase;

/**
 * Proves the N+1 tooling itself: lazy loading is forbidden outside production (so a missed
 * eager load fails a test instead of silently issuing a query per row), and is never
 * forbidden in production (so a miss there cannot turn into an error page).
 */
class LazyLoadingGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_lazy_loading_is_prevented_in_the_test_environment(): void
    {
        $this->assertTrue(Model::preventsLazyLoading());
    }

    public function test_lazy_loading_a_relation_from_a_multi_row_result_throws(): void
    {
        Artwork::factory()->count(2)->create();

        $artworks = Artwork::query()->get();

        $this->expectException(LazyLoadingViolationException::class);

        $artworks->first()->translations;
    }

    public function test_eager_loaded_relations_are_unaffected(): void
    {
        Artwork::factory()->count(2)->create();

        $artworks = Artwork::query()->with('translations')->get();

        $this->assertCount(0, $artworks->first()->translations);
    }

    public function test_the_application_itself_only_logs_a_violation_and_never_throws(): void
    {
        Artwork::factory()->count(2)->create();
        $artworks = Artwork::query()->get();

        // Boot the real provider so its (non-test) handler replaces the throwing one Tests\TestCase installs.
        (new AppServiceProvider($this->app))->boot();
        Log::shouldReceive('warning')->once()->with(\Mockery::pattern('/Lazy loading \[translations\] on model \[App\\\\Models\\\\Artwork\]/'));

        $this->assertCount(0, $artworks->first()->translations);
    }

    public function test_lazy_loading_prevention_is_never_enabled_in_production(): void
    {
        try {
            $this->app->detectEnvironment(fn () => 'production');
            (new AppServiceProvider($this->app))->boot();

            $this->assertFalse(Model::preventsLazyLoading());
        } finally {
            $this->app->detectEnvironment(fn () => 'testing');
            (new AppServiceProvider($this->app))->boot();
        }

        $this->assertTrue(Model::preventsLazyLoading());
    }

    public function test_the_benchmark_seeder_refuses_to_run_outside_local_and_testing(): void
    {
        try {
            $this->app->detectEnvironment(fn () => 'production');

            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('only runs in the local or testing environment');

            (new BenchmarkSeeder)->populate(3);
        } finally {
            $this->app->detectEnvironment(fn () => 'testing');
        }
    }
}
