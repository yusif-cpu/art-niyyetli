<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * No third role exists in this project (only `administrator`/`editor` per
 * Phase 02/03), so "an unrecognized role cannot access exhibition
 * management" has no role to construct against. The unauthenticated-request
 * assertions below are the closest real authorization boundary and are
 * covered.
 */
class ExhibitionAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    private function createUserWithRole(string $role, string $username = 'jane.admin', string $password = 'correct-password'): User
    {
        $user = User::factory()->create(['username' => $username, 'password' => $password]);
        $user->roles()->attach(Role::query()->firstOrCreate(['name' => $role]));

        return $user;
    }

    private function validExhibitionPayload(): array
    {
        return [
            'type' => 'exhibition',
            'status' => 'upcoming',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-exhibition-'.uniqid(), 'title' => 'Test', 'venue' => 'Gallery', 'short_text' => 'Short', 'full_text' => 'Full'],
            ],
        ];
    }

    public function test_unauthenticated_request_cannot_list_exhibitions(): void
    {
        $this->getJson('/admin/exhibitions')->assertStatus(401);
    }

    public function test_unauthenticated_request_cannot_create_exhibition(): void
    {
        $this->postJson('/admin/exhibitions', $this->validExhibitionPayload())->assertStatus(401);
    }

    public function test_administrator_can_manage_exhibitions(): void
    {
        $admin = $this->createUserWithRole('administrator');

        $created = $this->actingAs($admin)->postJson('/admin/exhibitions', $this->validExhibitionPayload());
        $created->assertOk();

        $this->actingAs($admin)->getJson('/admin/exhibitions')->assertOk();

        $id = $created->json('data.id') ?? $created->json('id');
        $this->actingAs($admin)->putJson("/admin/exhibitions/{$id}", ['is_active' => false])->assertOk();
    }

    public function test_editor_can_manage_exhibitions(): void
    {
        $editor = $this->createUserWithRole('editor');

        $created = $this->actingAs($editor)->postJson('/admin/exhibitions', $this->validExhibitionPayload());
        $created->assertOk();

        $this->actingAs($editor)->getJson('/admin/exhibitions')->assertOk();

        $id = $created->json('data.id') ?? $created->json('id');
        $this->actingAs($editor)->putJson("/admin/exhibitions/{$id}", ['is_active' => false])->assertOk();
    }

    public function test_editor_exhibition_access_does_not_grant_user_management_access(): void
    {
        $editor = $this->createUserWithRole('editor');

        $this->actingAs($editor)->getJson('/admin/exhibitions')->assertOk();
        $this->actingAs($editor)->getJson('/admin/users')->assertStatus(403);
    }
}
