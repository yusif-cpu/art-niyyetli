<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['administrator', 'editor'] as $name) {
            Role::query()->updateOrCreate(['name' => $name]);
        }
    }
}
