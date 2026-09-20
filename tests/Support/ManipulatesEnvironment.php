<?php

namespace Tests\Support;

/**
 * Sets or clears real environment variables for the duration of a test, and evaluates the shipped config
 * files against them.
 *
 * env() reads $_ENV, $_SERVER and getenv(), and a developer's real .env (or the Docker container's own
 * environment) may already define the variable, so all three are written together and restored afterwards.
 * The using test must call restoreEnvironment() from its tearDown().
 */
trait ManipulatesEnvironment
{
    /** @var array<string, array{0: mixed, 1: mixed, 2: string|false}> */
    private array $originalEnvironment = [];

    protected function setEnv(string $key, ?string $value): void
    {
        $this->originalEnvironment[$key] ??= [$_ENV[$key] ?? null, $_SERVER[$key] ?? null, getenv($key)];

        $this->writeEnv($key, $value, $value, $value);
    }

    protected function restoreEnvironment(): void
    {
        foreach ($this->originalEnvironment as $key => [$env, $server, $getenv]) {
            $this->writeEnv($key, $env, $server, $getenv === false ? null : $getenv);
        }

        $this->originalEnvironment = [];
    }

    /**
     * Evaluates a config file the way the framework does at boot, with the given variables set (null = unset).
     *
     * @param  array<string, string|null>  $environment
     */
    protected function configFileWith(string $file, array $environment): mixed
    {
        foreach ($environment as $key => $value) {
            $this->setEnv($key, $value);
        }

        return require base_path("config/{$file}.php");
    }

    private function writeEnv(string $key, mixed $env, mixed $server, ?string $getenv): void
    {
        if ($env === null) {
            unset($_ENV[$key]);
        } else {
            $_ENV[$key] = $env;
        }

        if ($server === null) {
            unset($_SERVER[$key]);
        } else {
            $_SERVER[$key] = $server;
        }

        putenv($getenv === null ? $key : "{$key}={$getenv}");
    }
}
