<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

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
