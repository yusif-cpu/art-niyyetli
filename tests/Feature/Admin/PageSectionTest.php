<?php

namespace Tests\Feature\Admin;

use App\Models\Page;
use App\Models\PageSection;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageSectionTest extends TestCase
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

    private function makePage(): Page
    {
        return Page::query()->create(['type' => 'home', 'is_active' => true]);
    }

    private function sectionPayload(array $overrides = []): array
    {
        return array_merge([
            'key' => 'hero',
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'heading' => 'Başlıq', 'body' => 'Mətn'],
            ],
        ], $overrides);
    }

    public function test_administrator_can_create_list_and_update_a_section(): void
    {
        $page = $this->makePage();

        $created = $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections", $this->sectionPayload());
        $created->assertOk();
        $sectionId = $created->json('data.id');

        $this->actingAs($this->admin)->getJson("/admin/pages/{$page->id}/sections")->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->admin)->putJson("/admin/pages/sections/{$sectionId}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
    }

    public function test_reordering_sections_updates_sort_order(): void
    {
        $page = $this->makePage();

        $first = PageSection::factory()->create(['page_id' => $page->id, 'key' => 'a', 'sort_order' => 0]);
        $second = PageSection::factory()->create(['page_id' => $page->id, 'key' => 'b', 'sort_order' => 1]);

        $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections/reorder", [
            'items' => [
                ['id' => $first->id, 'sort_order' => 1],
                ['id' => $second->id, 'sort_order' => 0],
            ],
        ])->assertOk();

        $this->assertSame(1, $first->fresh()->sort_order);
        $this->assertSame(0, $second->fresh()->sort_order);
    }

    public function test_duplicate_key_within_the_same_page_is_rejected(): void
    {
        $page = $this->makePage();

        $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections", $this->sectionPayload(['key' => 'hero']))
            ->assertOk();

        $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections", $this->sectionPayload(['key' => 'hero']))
            ->assertStatus(422);
    }

    public function test_reordering_with_a_section_from_another_page_is_rejected(): void
    {
        $page = $this->makePage();
        $otherPage = Page::query()->create(['type' => 'about', 'is_active' => true]);
        $foreignSection = PageSection::factory()->create(['page_id' => $otherPage->id]);

        $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections/reorder", [
            'items' => [['id' => $foreignSection->id, 'sort_order' => 0]],
        ])->assertStatus(422);
    }

    public function test_unauthenticated_request_is_denied(): void
    {
        $page = $this->makePage();

        $this->getJson("/admin/pages/{$page->id}/sections")->assertStatus(401);
        $this->postJson("/admin/pages/{$page->id}/sections", $this->sectionPayload())->assertStatus(401);
    }

    public function test_editor_can_manage_sections(): void
    {
        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $page = $this->makePage();

        $this->actingAs($editor)->postJson("/admin/pages/{$page->id}/sections", $this->sectionPayload())->assertOk();
    }

    public function test_the_home_page_contract_keys_cannot_be_renamed_but_stay_editable(): void
    {
        $page = $this->makePage();
        $created = $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections", $this->sectionPayload(['key' => 'steps']));
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->putJson("/admin/pages/sections/{$id}", ['key' => 'process'])
            ->assertUnprocessable()->assertJsonValidationErrors('key');
        $this->assertSame('steps', PageSection::query()->find($id)->key);

        // Re-sending the same key, editing content, deactivating and reordering are all still fine.
        $this->actingAs($this->admin)->putJson("/admin/pages/sections/{$id}", [
            'key' => 'steps', 'is_active' => false, 'sort_order' => 5,
            'translations' => [['locale' => 'az', 'heading' => 'Yeni', 'body' => 'Yeni mətn']],
        ])->assertOk()->assertJsonPath('data.key', 'steps')->assertJsonPath('data.is_active', false);
    }

    public function test_only_home_pages_lock_the_contract_keys(): void
    {
        $about = Page::query()->create(['type' => 'about', 'is_active' => true]);
        $id = $this->actingAs($this->admin)->postJson("/admin/pages/{$about->id}/sections", $this->sectionPayload(['key' => 'hero']))->json('data.id');

        $this->actingAs($this->admin)->putJson("/admin/pages/sections/{$id}", ['key' => 'intro'])->assertOk()->assertJsonPath('data.key', 'intro');
    }

    public function test_other_keys_on_the_home_page_may_be_renamed_and_unknown_keys_are_accepted(): void
    {
        $page = $this->makePage();
        $id = $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections", $this->sectionPayload(['key' => 'promo']))
            ->assertOk()->json('data.id');

        $this->actingAs($this->admin)->putJson("/admin/pages/sections/{$id}", ['key' => 'promo-banner'])->assertOk();
        $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections", $this->sectionPayload(['key' => 'how_it_works_2']))->assertOk();
    }

    public function test_new_keys_must_be_lowercase_slugs(): void
    {
        $page = $this->makePage();

        foreach (['Hero', 'my key', 'a/b', 'x--y', '-x', 'x-', 'ključ', str_repeat('a', 300)] as $key) {
            $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections", $this->sectionPayload(['key' => $key]))
                ->assertUnprocessable()->assertJsonValidationErrors('key');
        }
    }

    public function test_an_existing_legacy_key_is_left_alone_when_other_fields_are_saved(): void
    {
        $page = $this->makePage();
        $legacy = PageSection::factory()->create(['page_id' => $page->id, 'key' => 'Legacy Block']);

        $this->actingAs($this->admin)->putJson("/admin/pages/sections/{$legacy->id}", ['key' => 'Legacy Block', 'is_active' => false])
            ->assertOk()->assertJsonPath('data.key', 'Legacy Block');

        // Changing it to another invalid key is still rejected.
        $this->actingAs($this->admin)->putJson("/admin/pages/sections/{$legacy->id}", ['key' => 'Other Legacy'])->assertUnprocessable();
    }

    public function test_the_admin_page_reports_which_section_keys_the_public_site_relies_on(): void
    {
        $home = $this->makePage();
        $about = Page::query()->create(['type' => 'about', 'is_active' => true]);

        $this->actingAs($this->admin)->getJson("/admin/pages/{$home->id}")->assertJsonPath('data.section_keys', ['hero', 'steps', 'cta']);
        $this->actingAs($this->admin)->getJson("/admin/pages/{$about->id}")->assertJsonPath('data.section_keys', []);
    }
}
