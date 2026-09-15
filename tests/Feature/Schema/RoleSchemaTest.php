<?php

namespace Tests\Feature\Schema;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RoleSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_be_attached_to_a_role(): void
    {
        $user = User::factory()->create();
        $role = Role::create(['name' => 'administrator']);

        $user->roles()->attach($role);

        $this->assertCount(1, $user->fresh()->roles);
        $this->assertTrue($role->users()->first()->is($user));
    }

    public function test_attaching_the_same_role_twice_is_prevented_by_composite_key(): void
    {
        $user = User::factory()->create();
        $role = Role::create(['name' => 'editor']);

        DB::table('user_roles')->insert(['user_id' => $user->id, 'role_id' => $role->id]);

        $this->expectException(QueryException::class);
        DB::table('user_roles')->insert(['user_id' => $user->id, 'role_id' => $role->id]);
    }
}
