<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    /**
     * Creates a local-only development administrator, but only when all three
     * ADMIN_DEV_* env vars are set — never embeds a real credential in source.
     */
    public function run(): void
    {
        $username = env('ADMIN_DEV_USERNAME');
        $email = env('ADMIN_DEV_EMAIL');
        $password = env('ADMIN_DEV_PASSWORD');

        // A credential supplied through the environment must never provision an
        // administrator in production: fail loudly rather than skip silently, so the
        // leftover variable is noticed and removed.
        if ($password && app()->environment('production')) {
            throw new RuntimeException(
                'ADMIN_DEV_PASSWORD is set in a production environment. The development administrator seeder never runs in production; remove the ADMIN_DEV_* variables.'
            );
        }

        if (! $username || ! $email || ! $password) {
            return;
        }

        $user = User::query()->updateOrCreate(
            ['username' => $username],
            ['name' => 'Administrator', 'email' => $email, 'password' => $password]
        );

        $role = Role::query()->where('name', 'administrator')->first();

        if ($role) {
            $user->roles()->syncWithoutDetaching([$role->id]);
        }
    }
}
