<?php

namespace Tests\Feature\Schema;

use App\Models\EnquirySubject;
use App\Models\EnquirySubjectTranslation;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\EnquirySubjectSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The pre-test value of each variable changed by setEnv(), in $_ENV, $_SERVER and getenv().
     *
     * @var array<string, array{0: mixed, 1: mixed, 2: string|false}>
     */
    private array $originalEnv = [];

    protected function tearDown(): void
    {
        foreach ($this->originalEnv as $key => [$env, $server, $getenv]) {
            $this->writeEnv($key, $env, $server, $getenv === false ? null : $getenv);
        }

        parent::tearDown();
    }

    /**
     * The seeders read ADMIN_DEV_* with env(), which consults $_ENV, $_SERVER and getenv();
     * the developer's real .env may define them, so tests set or clear them explicitly.
     */
    private function setEnv(string $key, ?string $value): void
    {
        $this->originalEnv[$key] ??= [$_ENV[$key] ?? null, $_SERVER[$key] ?? null, getenv($key)];

        $this->writeEnv($key, $value, $value, $value);
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

    private function clearAdminDevEnv(): void
    {
        foreach (['ADMIN_DEV_USERNAME', 'ADMIN_DEV_EMAIL', 'ADMIN_DEV_PASSWORD'] as $key) {
            $this->setEnv($key, null);
        }
    }

    /**
     * Runs a seeder directly. `$this->seed()` goes through the `db:seed` command, which (rightly)
     * demands interactive confirmation when the application believes it is in production.
     */
    private function runSeeder(string $seeder): void
    {
        $this->app->make($seeder)->setContainer($this->app)->__invoke();
    }

    private function useEnvironment(string $environment): void
    {
        // Explicit, because APP_ENV is `local` inside the Docker container and `testing` elsewhere.
        $this->app->detectEnvironment(fn () => $environment);
    }

    public function test_role_and_enquiry_subject_seeders_are_idempotent(): void
    {
        $this->seed(RoleSeeder::class);
        $this->seed(EnquirySubjectSeeder::class);
        $this->seed(RoleSeeder::class);
        $this->seed(EnquirySubjectSeeder::class);

        $this->assertSame(2, Role::count());
        $this->assertSame(7, EnquirySubject::count());
        $this->assertSame(14, EnquirySubjectTranslation::count());
    }

    #[DataProvider('environments')]
    public function test_the_database_seeder_creates_the_test_user_only_in_local_and_testing(string $environment, bool $createsTestUser): void
    {
        $this->clearAdminDevEnv();
        $this->useEnvironment($environment);

        $this->runSeeder(DatabaseSeeder::class);

        $this->assertSame($createsTestUser, User::query()->where('email', 'test@example.com')->exists());
        $this->assertSame(2, Role::count(), 'the rest of the seeding is unaffected by the environment');
        $this->assertSame(7, EnquirySubject::count());
    }

    /** @return array<string, array{0: string, 1: bool}> */
    public static function environments(): array
    {
        return [
            'local' => ['local', true],
            'testing' => ['testing', true],
            'staging' => ['staging', false],
            'production' => ['production', false],
        ];
    }

    public function test_the_admin_user_seeder_creates_a_dev_administrator_in_local_from_the_environment(): void
    {
        $this->useEnvironment('local');
        $this->setEnv('ADMIN_DEV_USERNAME', 'dev.admin');
        $this->setEnv('ADMIN_DEV_EMAIL', 'dev.admin@example.test');
        $this->setEnv('ADMIN_DEV_PASSWORD', 'a-long-local-only-password');
        $this->runSeeder(RoleSeeder::class);

        $this->runSeeder(AdminUserSeeder::class);

        $user = User::query()->where('username', 'dev.admin')->firstOrFail();
        $this->assertTrue($user->hasRole('administrator'));
        $this->assertNotSame('a-long-local-only-password', $user->password, 'the password is stored hashed');
    }

    public function test_the_admin_user_seeder_does_nothing_without_the_environment_variables(): void
    {
        $this->clearAdminDevEnv();
        $this->useEnvironment('local');

        $this->runSeeder(AdminUserSeeder::class);

        $this->assertSame(0, User::count());
    }

    public function test_the_admin_user_seeder_refuses_to_provision_an_administrator_in_production(): void
    {
        $this->useEnvironment('production');
        $this->setEnv('ADMIN_DEV_USERNAME', 'dev.admin');
        $this->setEnv('ADMIN_DEV_EMAIL', 'dev.admin@example.test');
        $this->setEnv('ADMIN_DEV_PASSWORD', 'a-long-local-only-password');
        $this->runSeeder(RoleSeeder::class);

        try {
            $this->runSeeder(AdminUserSeeder::class);
            $this->fail('The seeder must refuse to run in production when ADMIN_DEV_PASSWORD is set.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('ADMIN_DEV_PASSWORD', $e->getMessage());
        }

        $this->assertSame(0, User::count());
    }

    public function test_the_admin_user_seeder_refuses_in_production_even_with_only_the_password_set(): void
    {
        $this->useEnvironment('production');
        $this->setEnv('ADMIN_DEV_USERNAME', null);
        $this->setEnv('ADMIN_DEV_EMAIL', null);
        $this->setEnv('ADMIN_DEV_PASSWORD', 'a-long-local-only-password');

        $this->expectException(RuntimeException::class);

        $this->runSeeder(AdminUserSeeder::class);
    }

    public function test_a_production_seed_without_dev_credentials_still_succeeds(): void
    {
        $this->clearAdminDevEnv();
        $this->useEnvironment('production');

        $this->runSeeder(DatabaseSeeder::class);

        $this->assertSame(0, User::count());
    }
}
