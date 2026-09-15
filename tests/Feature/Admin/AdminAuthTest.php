<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The app's CSRF protection is untouched (see bootstrap/app.php); this
        // only lets the test harness make repeated stateful requests per test
        // without hand-rolling token/cookie exchange for every call.
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    private function createUserWithRole(string $role, string $username = 'jane.admin', string $password = 'correct-password'): User
    {
        $user = User::factory()->create(['username' => $username, 'password' => $password]);
        $user->roles()->attach(Role::query()->firstOrCreate(['name' => $role]));

        return $user;
    }

    // -- Authentication --------------------------------------------------

    public function test_valid_username_and_password_can_authenticate(): void
    {
        $this->createUserWithRole('editor');

        $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'correct-password'])
            ->assertOk()
            ->assertJson(['message' => 'Authenticated.']);
    }

    public function test_invalid_password_is_rejected(): void
    {
        $this->createUserWithRole('editor');

        $response = $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'wrong-password']);

        $response->assertStatus(422);
        $this->assertFalse(Auth::check());
    }

    public function test_unknown_username_is_rejected(): void
    {
        $response = $this->postJson('/admin/login', ['username' => 'no-such-user', 'password' => 'whatever']);

        $response->assertStatus(422);
        $this->assertFalse(Auth::check());
    }

    public function test_invalid_password_and_unknown_username_return_the_identical_generic_message(): void
    {
        $this->createUserWithRole('editor');

        $wrongPassword = $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'wrong-password']);
        $unknownUsername = $this->postJson('/admin/login', ['username' => 'no-such-user', 'password' => 'whatever']);

        $this->assertSame(
            $wrongPassword->json('errors.username.0'),
            $unknownUsername->json('errors.username.0')
        );
    }

    public function test_successful_login_creates_an_authenticated_session(): void
    {
        $this->createUserWithRole('editor');

        $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'correct-password'])->assertOk();

        $this->assertTrue(Auth::check());
    }

    public function test_session_is_regenerated_after_login(): void
    {
        $this->createUserWithRole('editor');

        $this->get('/');
        $idBefore = session()->getId();

        $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'correct-password'])->assertOk();

        $this->assertNotSame($idBefore, session()->getId());
    }

    public function test_logout_invalidates_authentication(): void
    {
        $this->createUserWithRole('editor');

        $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'correct-password'])->assertOk();
        $this->assertTrue(Auth::check());

        $this->postJson('/admin/logout')->assertOk();

        $this->assertFalse(Auth::check());
    }

    // -- Authorization -----------------------------------------------------

    public function test_unauthenticated_user_cannot_access_protected_admin_route(): void
    {
        $this->getJson('/admin/dashboard')->assertStatus(401);
    }

    public function test_unauthenticated_request_to_admin_route_gets_json_even_without_accept_header(): void
    {
        // No frontend/login page exists yet, so admin/* must never attempt
        // to redirect to a non-existent "login" route.
        $this->get('/admin/dashboard')->assertStatus(401);
    }

    public function test_administrator_can_access_administrator_only_route(): void
    {
        $admin = $this->createUserWithRole('administrator');

        $this->actingAs($admin)->getJson('/admin/users')->assertOk();
    }

    public function test_editor_can_access_general_admin_area(): void
    {
        $editor = $this->createUserWithRole('editor');

        $this->actingAs($editor)->getJson('/admin/dashboard')->assertOk();
    }

    public function test_editor_receives_403_on_administrator_only_route(): void
    {
        $editor = $this->createUserWithRole('editor');

        $this->actingAs($editor)->getJson('/admin/users')->assertStatus(403);
    }

    // -- Throttling ----------------------------------------------------------

    public function test_repeated_failed_login_attempts_are_throttled(): void
    {
        // Exercises the per-username+IP limit (5/min) for a single, repeated username.
        $this->createUserWithRole('editor');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'wrong-password'])
                ->assertStatus(422);
        }

        $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'wrong-password'])
            ->assertStatus(429);
    }

    public function test_throttling_applies_equally_to_a_nonexistent_account_without_revealing_existence(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/admin/login', ['username' => 'ghost-user', 'password' => 'whatever'])
                ->assertStatus(422);
        }

        $this->postJson('/admin/login', ['username' => 'ghost-user', 'password' => 'whatever'])
            ->assertStatus(429);
    }

    public function test_username_rotation_from_the_same_ip_cannot_bypass_the_ip_wide_limit(): void
    {
        // A brand-new username on every request means the per-username+IP limit
        // (5/min) never trips for any single username. The per-IP limit (20/min)
        // must still catch this and block the 21st attempt from this IP.
        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/admin/login', ['username' => "rotating-user-{$i}", 'password' => 'whatever'])
                ->assertStatus(422);
        }

        $this->postJson('/admin/login', ['username' => 'rotating-user-final', 'password' => 'whatever'])
            ->assertStatus(429);
    }

    public function test_successful_login_clears_only_the_username_specific_counter_not_the_shared_ip_counter(): void
    {
        $this->createUserWithRole('editor');

        // Spend most of the shared per-IP budget on unrelated usernames.
        for ($i = 0; $i < 15; $i++) {
            $this->postJson('/admin/login', ['username' => "other-user-{$i}", 'password' => 'whatever'])
                ->assertStatus(422);
        }

        // A few failed attempts against the real account, then a real success.
        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'wrong-password'])
                ->assertStatus(422);
        }

        $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'correct-password'])->assertOk();
        $this->postJson('/admin/logout')->assertOk();

        // The username+IP counter was cleared by the success: jane.admin is not
        // immediately re-blocked despite having failed 4 times just before.
        $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'wrong-password'])
            ->assertStatus(422);

        // But the shared per-IP counter was NOT reset by that success. It has now
        // taken 15 + 4 + 1 = 20 failed hits from this IP, so the very next
        // attempt — even with a never-before-seen username — is IP-blocked.
        $this->postJson('/admin/login', ['username' => 'brand-new-user', 'password' => 'whatever'])
            ->assertStatus(429);
    }

    // -- Security --------------------------------------------------------

    public function test_password_is_not_exposed_in_responses(): void
    {
        $admin = $this->createUserWithRole('administrator');

        $response = $this->actingAs($admin)->getJson('/admin/users');

        $response->assertOk();
        $this->assertStringNotContainsString($admin->password, $response->getContent());
        $response->assertJsonMissingPath('users.0.password');
    }

    public function test_protected_route_cannot_be_accessed_after_logout(): void
    {
        $this->createUserWithRole('editor');

        $this->postJson('/admin/login', ['username' => 'jane.admin', 'password' => 'correct-password'])->assertOk();
        $this->getJson('/admin/dashboard')->assertOk();

        $this->postJson('/admin/logout')->assertOk();

        $this->getJson('/admin/dashboard')->assertStatus(401);
    }
}
