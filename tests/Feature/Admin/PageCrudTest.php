<?php

namespace Tests\Feature\Admin;

use App\Models\NavigationItem;
use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageCrudTest extends TestCase
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

    private function validPagePayload(array $overrides = []): array
    {
        return array_merge([
            'type' => 'about',
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'about-'.uniqid(), 'title' => 'Haqqımızda', 'content' => 'Məzmun'],
            ],
        ], $overrides);
    }

    public function test_administrator_can_create_list_show_and_update_a_page(): void
    {
        $created = $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload());
        $created->assertOk();
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->getJson('/admin/pages')->assertOk();
        $this->actingAs($this->admin)->getJson("/admin/pages/{$id}")->assertOk();

        $this->actingAs($this->admin)->putJson("/admin/pages/{$id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
    }

    public function test_translations_are_created_together_with_the_page(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'az-slug-'.uniqid(), 'title' => 'AZ Title', 'content' => 'AZ content'],
                ['locale' => 'en', 'slug' => 'en-slug-'.uniqid(), 'title' => 'EN Title', 'content' => 'EN content'],
            ],
        ]));

        $response->assertOk();
        $id = $response->json('data.id');

        $show = $this->actingAs($this->admin)->getJson("/admin/pages/{$id}?locale=en");
        $show->assertJsonPath('data.translation.title', 'EN Title');
    }

    public function test_updating_the_en_translation_does_not_overwrite_the_az_translation(): void
    {
        $created = $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'az-slug-'.uniqid(), 'title' => 'Original AZ Title', 'content' => 'AZ content'],
            ],
        ]));
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->putJson("/admin/pages/{$id}", [
            'translations' => [
                ['locale' => 'en', 'slug' => 'en-slug-'.uniqid(), 'title' => 'EN Title', 'content' => 'EN content'],
            ],
        ])->assertOk();

        $azShow = $this->actingAs($this->admin)->getJson("/admin/pages/{$id}?locale=az");
        $azShow->assertJsonPath('data.translation.title', 'Original AZ Title');
    }

    public function test_duplicate_localized_slug_against_another_page_is_rejected(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload([
            'type' => 'about',
            'translations' => [['locale' => 'az', 'slug' => 'existing-page-slug', 'title' => 'A', 'content' => 'C']],
        ]))->assertOk();

        $response = $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload([
            'type' => 'contact',
            'translations' => [['locale' => 'az', 'slug' => 'existing-page-slug', 'title' => 'B', 'content' => 'C']],
        ]));

        $response->assertStatus(422);
    }

    public function test_mass_assignment_is_not_possible_via_unexpected_fields(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload([
            'id' => 999,
            'created_at' => '2000-01-01T00:00:00Z',
        ]));

        $response->assertOk();
        $this->assertNotSame(999, $response->json('data.id'));
    }

    public function test_invalid_page_type_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/pages', $this->validPagePayload(['type' => 'pricing']))
            ->assertStatus(422);
    }

    public function test_duplicate_page_type_is_rejected(): void
    {
        Page::query()->create(['type' => 'about', 'is_active' => true]);

        $this->actingAs($this->admin)
            ->postJson('/admin/pages', $this->validPagePayload(['type' => 'about']))
            ->assertStatus(422);
    }

    public function test_multiple_custom_type_pages_can_be_created(): void
    {
        $first = $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload([
            'type' => 'custom',
            'translations' => [['locale' => 'az', 'slug' => 'privacy-policy-'.uniqid(), 'title' => 'Məxfilik siyasəti', 'content' => 'Məzmun']],
        ]));
        $first->assertOk();

        $second = $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload([
            'type' => 'custom',
            'translations' => [['locale' => 'az', 'slug' => 'terms-of-use-'.uniqid(), 'title' => 'İstifadə şərtləri', 'content' => 'Məzmun']],
        ]));
        $second->assertOk();

        $this->assertNotSame($first->json('data.id'), $second->json('data.id'));
    }

    public function test_duplicate_page_type_is_still_rejected_for_canonical_types(): void
    {
        Page::query()->create(['type' => 'home', 'is_active' => true]);

        $this->actingAs($this->admin)
            ->postJson('/admin/pages', $this->validPagePayload([
                'type' => 'home',
                'translations' => [['locale' => 'az', 'slug' => 'home-'.uniqid(), 'title' => 'Home', 'content' => 'C']],
            ]))
            ->assertStatus(422);
    }

    public function test_custom_page_slug_still_rejects_collisions_with_other_pages(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload([
            'type' => 'custom',
            'translations' => [['locale' => 'az', 'slug' => 'custom-collision-slug', 'title' => 'A', 'content' => 'C']],
        ]))->assertOk();

        $response = $this->actingAs($this->admin)->postJson('/admin/pages', $this->validPagePayload([
            'type' => 'custom',
            'translations' => [['locale' => 'az', 'slug' => 'custom-collision-slug', 'title' => 'B', 'content' => 'C']],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['translations.0.slug']);
    }

    public function test_custom_page_type_can_be_updated_without_uniqueness_conflict(): void
    {
        $first = Page::query()->create(['type' => 'custom', 'is_active' => true]);
        $second = Page::query()->create(['type' => 'custom', 'is_active' => true]);

        $this->actingAs($this->admin)->putJson("/admin/pages/{$second->id}", ['type' => 'custom'])
            ->assertOk();
    }

    public function test_unauthenticated_request_cannot_list_or_create_pages(): void
    {
        $this->getJson('/admin/pages')->assertStatus(401);
        $this->postJson('/admin/pages', $this->validPagePayload())->assertStatus(401);
    }

    public function test_editor_can_manage_pages(): void
    {
        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $this->actingAs($editor)->postJson('/admin/pages', $this->validPagePayload())->assertOk();
        $this->actingAs($editor)->getJson('/admin/pages')->assertOk();
    }

    public function test_administrator_can_delete_a_custom_page(): void
    {
        $page = Page::query()->create(['type' => 'custom', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'deletable', 'title' => 'X', 'content' => 'C']);

        $response = $this->actingAs($this->admin)->deleteJson("/admin/pages/{$page->id}");

        $response->assertOk();
        $this->assertSoftDeleted('pages', ['id' => $page->id]);
        $this->actingAs($this->admin)->getJson('/admin/pages')->assertJsonMissing(['id' => $page->id]);
    }

    public function test_deleting_a_page_removes_its_navigation_item(): void
    {
        $page = Page::query()->create(['type' => 'custom', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'deletable-nav', 'title' => 'X', 'content' => 'C']);
        $item = NavigationItem::factory()->forPage($page->id)->create(['placement' => 'footer', 'sort_order' => 0]);

        $this->actingAs($this->admin)->deleteJson("/admin/pages/{$page->id}")->assertOk();

        $this->assertDatabaseMissing('navigation_items', ['id' => $item->id]);
    }

    public function test_a_normal_cms_page_with_navigation_entries_is_deletable_while_structural_pages_stay_protected(): void
    {
        // Regression test for a reported UAT bug: a normal (non-structural)
        // CMS page with navigation entries in both placements could not be
        // deleted. Traced to PageService::delete()'s navigation cleanup query
        // failing when the navigation_items table was missing from the local
        // database (a pending-migration issue, not a guard/authorization bug).
        $page = Page::query()->create(['type' => 'custom', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'swdff', 'title' => 'swdff', 'content' => 'C']);
        $headerItem = NavigationItem::factory()->forPage($page->id)->create(['placement' => 'header', 'sort_order' => 0]);
        $footerItem = NavigationItem::factory()->forPage($page->id)->create(['placement' => 'footer', 'sort_order' => 0]);

        $response = $this->actingAs($this->admin)->deleteJson("/admin/pages/{$page->id}");

        $response->assertOk()->assertJsonPath('message', 'Page archived.');
        $this->assertSoftDeleted('pages', ['id' => $page->id]);
        $this->assertDatabaseMissing('navigation_items', ['id' => $headerItem->id]);
        $this->assertDatabaseMissing('navigation_items', ['id' => $footerItem->id]);

        $structural = Page::query()->create(['type' => 'about', 'is_active' => true]);
        $structural->translations()->create(['locale' => 'az', 'slug' => 'about-protected', 'title' => 'Y', 'content' => 'C']);

        $protectedResponse = $this->actingAs($this->admin)->deleteJson("/admin/pages/{$structural->id}");

        $protectedResponse->assertStatus(409);
        $this->assertNull($structural->fresh()->deleted_at);
    }

    public function test_deleting_a_structural_page_is_rejected(): void
    {
        $page = Page::query()->create(['type' => 'home', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Home', 'content' => 'C']);

        $response = $this->actingAs($this->admin)->deleteJson("/admin/pages/{$page->id}");

        $response->assertStatus(409);
        $this->assertNull($page->fresh()->deleted_at);
    }

    public function test_unauthenticated_request_cannot_delete_a_page(): void
    {
        $page = Page::query()->create(['type' => 'custom', 'is_active' => true]);

        $this->deleteJson("/admin/pages/{$page->id}")->assertStatus(401);
        $this->assertNull($page->fresh()->deleted_at);
    }
}
