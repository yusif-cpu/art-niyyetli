<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\SocialLink;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocialLinkTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'platform' => 'instagram',
            'url' => 'https://instagram.com/artniyyetli',
            'is_active' => true,
        ], $overrides);
    }

    public function test_administrator_can_create_list_update_and_delete_a_social_link(): void
    {
        $created = $this->actingAs($this->admin)->postJson('/admin/social-links', $this->payload());
        $created->assertOk();
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->getJson('/admin/social-links')->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->admin)->putJson("/admin/social-links/{$id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($this->admin)->deleteJson("/admin/social-links/{$id}")->assertOk();
        $this->assertDatabaseMissing('social_links', ['id' => $id]);
    }

    public function test_reordering_social_links_updates_sort_order(): void
    {
        $first = SocialLink::factory()->create(['sort_order' => 0]);
        $second = SocialLink::factory()->create(['sort_order' => 1]);

        $this->actingAs($this->admin)->postJson('/admin/social-links/reorder', [
            'items' => [
                ['id' => $first->id, 'sort_order' => 1],
                ['id' => $second->id, 'sort_order' => 0],
            ],
        ])->assertOk();

        $this->assertSame(1, $first->fresh()->sort_order);
        $this->assertSame(0, $second->fresh()->sort_order);
    }

    public function test_javascript_scheme_url_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['url' => 'javascript:alert(1)']))
            ->assertStatus(422);
    }

    public function test_data_scheme_url_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['url' => 'data:text/html,<script>alert(1)</script>']))
            ->assertStatus(422);
    }

    public function test_valid_https_url_is_accepted(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['url' => 'https://wa.me/994500000000']))
            ->assertOk();
    }

    public function test_unauthenticated_request_is_denied(): void
    {
        $this->getJson('/admin/social-links')->assertStatus(401);
        $this->postJson('/admin/social-links', $this->payload())->assertStatus(401);
    }

    public function test_editor_can_manage_social_links(): void
    {
        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $this->actingAs($editor)->postJson('/admin/social-links', $this->payload())->assertOk();
    }
}
