<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementCrudTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $editor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));

        $this->editor = User::factory()->create(['username' => 'joe.editor']);
        $this->editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));
    }

    private function validUserPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'New User',
            'username' => 'new.user',
            'email' => 'new.user@example.com',
            'password' => 'a-long-passphrase-42',
            'roles' => ['editor'],
            'is_active' => true,
        ], $overrides);
    }

    public function test_administrator_can_create_a_user_with_roles(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/users', $this->validUserPayload());

        $response->assertCreated();
        $data = $response->json('data') ?? $response->json();

        $this->assertSame('New User', $data['name']);
        $this->assertSame('new.user', $data['username']);
        $this->assertSame('new.user@example.com', $data['email']);
        $this->assertTrue($data['is_active']);
        $this->assertSame(['editor'], $data['roles']);
        $this->assertArrayNotHasKey('password', $data);

        $user = User::where('username', 'new.user')->first();
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('a-long-passphrase-42', $user->password));
        $this->assertTrue($user->hasRole('editor'));
    }

    public function test_administrator_can_update_a_users_roles_and_active_state(): void
    {
        $target = User::factory()->create(['username' => 'target.user']);
        $target->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $response = $this->actingAs($this->admin)->putJson("/admin/users/{$target->id}", [
            'roles' => ['administrator'],
            'is_active' => false,
        ]);

        $response->assertOk();
        $data = $response->json('data') ?? $response->json();

        $this->assertFalse($data['is_active']);
        $this->assertSame(['administrator'], $data['roles']);

        $target->refresh();
        $this->assertFalse((bool) $target->is_active);
        $this->assertTrue($target->hasRole('administrator'));
        $this->assertFalse($target->hasRole('editor'));
    }

    public function test_administrator_can_delete_an_editor_user(): void
    {
        $target = User::factory()->create(['username' => 'target.user']);
        $target->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $response = $this->actingAs($this->admin)->deleteJson("/admin/users/{$target->id}");

        $response->assertOk();
        $response->assertJson(['message' => 'User removed.']);
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    public function test_administrator_can_delete_a_non_last_administrator_user(): void
    {
        // A second active administrator exists, so deleting $this->admin never
        // strips the last administrator and the guard must allow it through.
        $secondAdmin = User::factory()->create(['username' => 'second.admin']);
        $secondAdmin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));

        $response = $this->actingAs($secondAdmin)->deleteJson("/admin/users/{$this->admin->id}");

        $response->assertOk();
        $response->assertJson(['message' => 'User removed.']);
        $this->assertDatabaseMissing('users', ['id' => $this->admin->id]);
    }

    public function test_deleting_the_last_active_administrator_is_blocked(): void
    {
        // $this->admin is the only active administrator in this test's data set.
        $response = $this->actingAs($this->admin)->deleteJson("/admin/users/{$this->admin->id}");

        $response->assertStatus(409);
        $response->assertJson(['message' => 'Son aktiv administrator hesabı silinə və ya deaktiv edilə bilməz.']);

        $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
        $this->assertTrue($this->admin->refresh()->hasRole('administrator'));
    }

    public function test_deactivating_the_last_active_administrator_is_blocked(): void
    {
        $response = $this->actingAs($this->admin)->putJson("/admin/users/{$this->admin->id}", [
            'is_active' => false,
        ]);

        $response->assertStatus(409);
        $response->assertJson(['message' => 'Son aktiv administrator hesabı silinə və ya deaktiv edilə bilməz.']);

        $this->admin->refresh();
        $this->assertTrue((bool) $this->admin->is_active);
        $this->assertTrue($this->admin->hasRole('administrator'));
    }

    public function test_a_second_active_administrator_allows_deactivation_of_the_first(): void
    {
        $secondAdmin = User::factory()->create(['username' => 'second.admin']);
        $secondAdmin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));

        $response = $this->actingAs($this->admin)->putJson("/admin/users/{$this->admin->id}", [
            'is_active' => false,
        ]);

        $response->assertOk();
        $this->assertFalse((bool) $this->admin->refresh()->is_active);
    }

    public function test_revoking_the_administrator_role_from_the_last_active_administrator_is_blocked(): void
    {
        // $this->admin is the only active administrator in this test's data set.
        // Swapping their role to editor-only would leave zero administrators.
        $response = $this->actingAs($this->admin)->putJson("/admin/users/{$this->admin->id}", [
            'roles' => ['editor'],
        ]);

        $response->assertStatus(409);
        $response->assertJson(['message' => 'Son aktiv administrator hesabı silinə və ya deaktiv edilə bilməz.']);

        $this->admin->refresh();
        $this->assertTrue($this->admin->hasRole('administrator'));
        $this->assertFalse($this->admin->hasRole('editor'));
    }

    public function test_editor_gets_403_on_user_management_routes(): void
    {
        $target = User::factory()->create();

        $this->actingAs($this->editor)->getJson('/admin/users')->assertStatus(403);
        $this->actingAs($this->editor)->postJson('/admin/users', $this->validUserPayload())->assertStatus(403);
        $this->actingAs($this->editor)->putJson("/admin/users/{$target->id}", ['is_active' => false])->assertStatus(403);
        $this->actingAs($this->editor)->deleteJson("/admin/users/{$target->id}")->assertStatus(403);
    }

    public function test_duplicate_username_on_create_is_rejected(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/users', $this->validUserPayload([
            'username' => 'jane.admin',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['username']);
    }

    public function test_duplicate_email_on_create_is_rejected(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/users', $this->validUserPayload([
            'email' => $this->admin->email,
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
    }

    public function test_unknown_role_on_create_is_rejected(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/users', $this->validUserPayload([
            'roles' => ['superuser'],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['roles.0']);
    }

    public function test_updating_a_user_without_password_keeps_the_existing_hash(): void
    {
        $target = User::factory()->create(['username' => 'target.user', 'password' => 'original-password']);
        $target->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));
        $originalHash = $target->password;

        $response = $this->actingAs($this->admin)->putJson("/admin/users/{$target->id}", [
            'name' => 'Updated Name',
        ]);

        $response->assertOk();

        $target->refresh();
        $this->assertSame($originalHash, $target->password);
        $this->assertTrue(Hash::check('original-password', $target->password));
    }

    // -- Password policy for new and changed passwords ---------------------------------------------------

    public function test_a_new_users_password_must_be_at_least_12_characters(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/users', $this->validUserPayload(['password' => 'abcdefgh123']))
            ->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->actingAs($this->admin)->postJson('/admin/users', $this->validUserPayload(['password' => 'abcdefghij12']))
            ->assertCreated();
    }

    public function test_a_new_users_password_needs_letters_and_numbers(): void
    {
        foreach (['onlylettersnonumbers', '123456789012345'] as $weak) {
            $this->actingAs($this->admin)->postJson('/admin/users', $this->validUserPayload(['password' => $weak]))
                ->assertStatus(422)->assertJsonValidationErrors(['password']);
        }

        $this->assertDatabaseMissing('users', ['username' => 'new.user']);
    }

    public function test_a_password_longer_than_255_characters_or_an_array_is_refused(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/users', $this->validUserPayload(['password' => str_repeat('a1', 128)]))
            ->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->actingAs($this->admin)->postJson('/admin/users', $this->validUserPayload(['password' => ['a-long-passphrase-42']]))
            ->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_changing_a_password_is_held_to_the_same_policy(): void
    {
        $target = User::factory()->create(['username' => 'target.user', 'password' => 'original-password']);
        $hash = $target->password;

        $this->actingAs($this->admin)->putJson("/admin/users/{$target->id}", ['password' => 'short1'])
            ->assertStatus(422)->assertJsonValidationErrors(['password']);
        $this->actingAs($this->admin)->putJson("/admin/users/{$target->id}", ['password' => 'lettersonlylettersonly'])
            ->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->assertSame($hash, $target->fresh()->password, 'a refused change leaves the password alone');

        $this->actingAs($this->admin)->putJson("/admin/users/{$target->id}", ['password' => 'a-new-passphrase-77'])->assertOk();

        $this->assertTrue(Hash::check('a-new-passphrase-77', $target->fresh()->password));
    }

    public function test_an_existing_user_with_a_weak_password_is_not_forced_to_change_it(): void
    {
        // The policy applies to a password that is being set, never retroactively.
        $target = User::factory()->create(['username' => 'target.user', 'password' => 'short']);
        $hash = $target->password;

        foreach ([['name' => 'Renamed User'], ['password' => null], ['password' => ''], ['is_active' => true]] as $payload) {
            $this->actingAs($this->admin)->putJson("/admin/users/{$target->id}", $payload)->assertOk();
        }

        $this->assertSame($hash, $target->fresh()->password);

        $this->postJson('/admin/login', ['username' => 'target.user', 'password' => 'short'])->assertOk();
    }
}
