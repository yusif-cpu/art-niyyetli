<?php

namespace Tests\Unit\Models;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserHasRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_has_role_reflects_attached_roles_only(): void
    {
        $user = User::factory()->create();
        $administrator = Role::create(['name' => 'administrator']);
        Role::create(['name' => 'editor']);

        $user->roles()->attach($administrator);

        $this->assertTrue($user->hasRole('administrator'));
        $this->assertFalse($user->hasRole('editor'));
    }
}
