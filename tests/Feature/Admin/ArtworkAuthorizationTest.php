<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * No third role exists in this project (only `administrator`/`editor` per
 * Phase 02/03), so "an unrecognized role cannot access artwork management"
 * has no role to construct against. The unauthenticated-request assertions
 * below are the closest real authorization boundary and are covered.
 */
class ArtworkAuthorizationTest extends TestCase
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

    private function validArtworkPayload(): array
    {
        return [
            'artist_id' => Artist::factory()->create()->id,
            'medium_id' => Medium::factory()->create()->id,
            'genre_id' => Genre::factory()->create()->id,
            'year_created' => 2020,
            'width_cm' => 50,
            'height_cm' => 70,
            'price' => 1500,
            'show_price' => true,
            'availability' => 'available',
            'certificate' => false,
            'featured' => false,
            'show_on_wall' => false,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-artwork', 'title' => 'Test', 'short_description' => 'Short', 'provenance' => 'Provenance'],
            ],
        ];
    }

    public function test_unauthenticated_request_cannot_list_artworks(): void
    {
        $this->getJson('/admin/artworks')->assertStatus(401);
    }

    public function test_unauthenticated_request_cannot_create_artwork(): void
    {
        $this->postJson('/admin/artworks', $this->validArtworkPayload())->assertStatus(401);
    }

    public function test_administrator_can_manage_artworks(): void
    {
        $admin = $this->createUserWithRole('administrator');

        $created = $this->actingAs($admin)->postJson('/admin/artworks', $this->validArtworkPayload());
        $created->assertOk();

        $this->actingAs($admin)->getJson('/admin/artworks')->assertOk();

        $id = $created->json('data.id') ?? $created->json('id');
        $this->actingAs($admin)->putJson("/admin/artworks/{$id}", ['price' => 1600])->assertOk();
    }

    public function test_editor_can_manage_artworks(): void
    {
        $editor = $this->createUserWithRole('editor');

        $created = $this->actingAs($editor)->postJson('/admin/artworks', $this->validArtworkPayload());
        $created->assertOk();

        $this->actingAs($editor)->getJson('/admin/artworks')->assertOk();

        $id = $created->json('data.id') ?? $created->json('id');
        $this->actingAs($editor)->putJson("/admin/artworks/{$id}", ['price' => 1600])->assertOk();
    }

    public function test_editor_artwork_access_does_not_grant_user_management_access(): void
    {
        $editor = $this->createUserWithRole('editor');

        $this->actingAs($editor)->getJson('/admin/artworks')->assertOk();
        $this->actingAs($editor)->getJson('/admin/users')->assertStatus(403);
    }
}
