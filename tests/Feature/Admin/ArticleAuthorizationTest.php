<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * No third role exists in this project (only `administrator`/`editor` per
 * Phase 02/03), so "an unrecognized role cannot access article management"
 * has no role to construct against. The unauthenticated-request assertions
 * below are the closest real authorization boundary and are covered.
 */
class ArticleAuthorizationTest extends TestCase
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

    private function validArticlePayload(): array
    {
        return [
            'type' => 'news',
            'status' => 'draft',
            'published_at' => null,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-article-'.uniqid(), 'title' => 'Test', 'short_text' => 'Short', 'content' => 'Content'],
            ],
        ];
    }

    public function test_unauthenticated_request_cannot_list_articles(): void
    {
        $this->getJson('/admin/articles')->assertStatus(401);
    }

    public function test_unauthenticated_request_cannot_create_article(): void
    {
        $this->postJson('/admin/articles', $this->validArticlePayload())->assertStatus(401);
    }

    public function test_administrator_can_manage_articles(): void
    {
        $admin = $this->createUserWithRole('administrator');

        $created = $this->actingAs($admin)->postJson('/admin/articles', $this->validArticlePayload());
        $created->assertOk();

        $this->actingAs($admin)->getJson('/admin/articles')->assertOk();

        $id = $created->json('data.id') ?? $created->json('id');
        $this->actingAs($admin)->putJson("/admin/articles/{$id}", ['is_active' => false])->assertOk();
    }

    public function test_editor_can_manage_articles(): void
    {
        $editor = $this->createUserWithRole('editor');

        $created = $this->actingAs($editor)->postJson('/admin/articles', $this->validArticlePayload());
        $created->assertOk();

        $this->actingAs($editor)->getJson('/admin/articles')->assertOk();

        $id = $created->json('data.id') ?? $created->json('id');
        $this->actingAs($editor)->putJson("/admin/articles/{$id}", ['is_active' => false])->assertOk();
    }

    public function test_editor_article_access_does_not_grant_user_management_access(): void
    {
        $editor = $this->createUserWithRole('editor');

        $this->actingAs($editor)->getJson('/admin/articles')->assertOk();
        $this->actingAs($editor)->getJson('/admin/users')->assertStatus(403);
    }
}
