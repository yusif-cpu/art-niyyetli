<?php

namespace Tests\Feature\Admin;

use App\Models\Faq;
use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FaqCrudTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Page $page;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));

        $this->page = Page::query()->create(['type' => 'collectors', 'is_active' => true]);
    }

    private function faqPayload(array $overrides = []): array
    {
        return array_merge([
            'page_id' => $this->page->id,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'question' => 'Necə sifariş verə bilərəm?', 'answer' => 'Sorğu göndərin.'],
            ],
        ], $overrides);
    }

    public function test_administrator_can_create_list_update_and_delete_a_faq(): void
    {
        $created = $this->actingAs($this->admin)->postJson('/admin/faqs', $this->faqPayload());
        $created->assertOk();
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->getJson('/admin/faqs')->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->admin)->putJson("/admin/faqs/{$id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($this->admin)->deleteJson("/admin/faqs/{$id}")->assertOk();
        $this->assertDatabaseMissing('faqs', ['id' => $id]);
    }

    public function test_updating_the_en_translation_does_not_overwrite_the_az_translation(): void
    {
        $created = $this->actingAs($this->admin)->postJson('/admin/faqs', $this->faqPayload());
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->putJson("/admin/faqs/{$id}", [
            'translations' => [
                ['locale' => 'en', 'question' => 'How can I order?', 'answer' => 'Send an enquiry.'],
            ],
        ])->assertOk();

        $azShow = $this->actingAs($this->admin)->getJson("/admin/faqs/{$id}?locale=az");
        $azShow->assertJsonPath('data.translation.question', 'Necə sifariş verə bilərəm?');
    }

    public function test_reordering_faqs_updates_sort_order(): void
    {
        $first = Faq::factory()->create(['page_id' => $this->page->id, 'sort_order' => 0]);
        $second = Faq::factory()->create(['page_id' => $this->page->id, 'sort_order' => 1]);

        $this->actingAs($this->admin)->postJson('/admin/faqs/reorder', [
            'items' => [
                ['id' => $first->id, 'sort_order' => 1],
                ['id' => $second->id, 'sort_order' => 0],
            ],
        ])->assertOk();

        $this->assertSame(1, $first->fresh()->sort_order);
        $this->assertSame(0, $second->fresh()->sort_order);
    }

    public function test_nonexistent_page_id_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/faqs', $this->faqPayload(['page_id' => 999999]))
            ->assertStatus(422);
    }

    public function test_unauthenticated_request_is_denied(): void
    {
        $this->getJson('/admin/faqs')->assertStatus(401);
        $this->postJson('/admin/faqs', $this->faqPayload())->assertStatus(401);
    }

    public function test_editor_can_manage_faqs(): void
    {
        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $this->actingAs($editor)->postJson('/admin/faqs', $this->faqPayload())->assertOk();
    }
}
