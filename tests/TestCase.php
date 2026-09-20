<?php

namespace Tests;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // The application only logs a lazy-loading violation (see AppServiceProvider). In tests
        // it must fail loudly so a missed eager load — an N+1 — breaks the build. This is
        // deliberately not keyed on APP_ENV: inside the Docker container APP_ENV is `local`
        // (a real environment variable, which phpunit.xml's <env> does not override), so
        // `app()->runningUnitTests()` is false there.
        Model::handleLazyLoadingViolationUsing(
            fn (Model $model, string $relation) => throw new LazyLoadingViolationException($model, $relation)
        );
    }
}
