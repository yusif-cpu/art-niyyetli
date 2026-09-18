<?php

namespace Tests\Feature\Admin;

use App\Models\NavigationItem;
use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NavigationControllerTest extends TestCase
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

    private function makePage(string $slug): Page
    {
        $page = Page::factory()->create(['type' => 'custom', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => $slug, 'title' => ucfirst($slug), 'content' => 'C']);

        return $page;
    }

    public function test_unauthenticated_request_cannot_list_navigation(): void
    {
        $this->getJson('/admin/navigation')->assertStatus(401);
    }

    public function test_administrator_sees_the_seeded_header_routes_grouped_by_placement(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/admin/navigation');

        $response->assertOk();
        $header = $response->json('data.header');
        $this->assertSame(['artworks', 'artists', 'exhibitions', 'articles'], array_column($header, 'route_key'));
        $this->assertSame([], $response->json('data.footer'));
        $this->assertSame(['artworks', 'artists', 'exhibitions', 'articles'], $response->json('meta.available_routes'));
    }

    public function test_administrator_can_add_a_page_to_the_header_appended_at_the_end(): void
    {
        $page = $this->makePage('about');

        $response = $this->actingAs($this->admin)->postJson('/admin/navigation', [
            'placement' => 'header',
            'nav_type' => 'page',
            'page_id' => $page->id,
        ]);

        $response->assertOk();
        $this->assertSame(4, $response->json('data.sort_order'));
        $this->assertSame('About', $response->json('data.page.title'));
    }

    public function test_administrator_can_add_a_route_to_the_footer(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/navigation', [
            'placement' => 'footer',
            'nav_type' => 'route',
            'route_key' => 'artworks',
        ]);

        $response->assertOk();
        $this->assertSame(0, $response->json('data.sort_order'));
        $this->assertSame('artworks', $response->json('data.route_key'));
    }

    public function test_adding_a_route_already_present_in_the_same_placement_is_rejected(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/navigation', [
            'placement' => 'header',
            'nav_type' => 'route',
            'route_key' => 'artworks',
        ]);

        $response->assertStatus(422);
    }

    public function test_adding_the_same_page_twice_to_the_same_placement_is_rejected(): void
    {
        $page = $this->makePage('about');
        $this->actingAs($this->admin)->postJson('/admin/navigation', [
            'placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id,
        ])->assertOk();

        $response = $this->actingAs($this->admin)->postJson('/admin/navigation', [
            'placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_a_page_type_item_without_a_page_id_is_rejected(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/navigation', [
            'placement' => 'header', 'nav_type' => 'page',
        ])->assertStatus(422)->assertJsonValidationErrors(['page_id']);
    }

    public function test_a_page_type_item_with_a_route_key_is_rejected(): void
    {
        $page = $this->makePage('about');

        $this->actingAs($this->admin)->postJson('/admin/navigation', [
            'placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => 'artworks',
        ])->assertStatus(422)->assertJsonValidationErrors(['route_key']);
    }

    public function test_adding_a_soft_deleted_page_is_rejected(): void
    {
        $page = $this->makePage('archived');
        $page->delete();

        $this->actingAs($this->admin)->postJson('/admin/navigation', [
            'placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['page_id']);
    }

    public function test_administrator_can_toggle_visibility_without_losing_its_position(): void
    {
        $item = NavigationItem::query()->where('placement', 'header')->where('route_key', 'artworks')->first();

        $response = $this->actingAs($this->admin)->putJson("/admin/navigation/{$item->id}", ['is_visible' => false]);

        $response->assertOk();
        $this->assertFalse($response->json('data.is_visible'));
        $this->assertSame($item->sort_order, $response->json('data.sort_order'));
    }

    public function test_administrator_can_move_an_item_to_a_different_placement(): void
    {
        $item = NavigationItem::query()->where('placement', 'header')->where('route_key', 'artworks')->first();

        $response = $this->actingAs($this->admin)->putJson("/admin/navigation/{$item->id}", ['placement' => 'footer']);

        $response->assertOk();
        $this->assertSame('footer', $response->json('data.placement'));
    }

    public function test_moving_an_item_into_a_placement_where_it_already_exists_is_rejected(): void
    {
        $header = NavigationItem::query()->where('placement', 'header')->where('route_key', 'artworks')->first();
        NavigationItem::factory()->create(['placement' => 'footer', 'nav_type' => 'route', 'route_key' => 'artworks', 'page_id' => null]);

        $response = $this->actingAs($this->admin)->putJson("/admin/navigation/{$header->id}", ['placement' => 'footer']);

        $response->assertStatus(422);
    }

    public function test_administrator_can_delete_a_navigation_item(): void
    {
        $item = NavigationItem::query()->where('placement', 'header')->where('route_key', 'artworks')->first();

        $response = $this->actingAs($this->admin)->deleteJson("/admin/navigation/{$item->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('navigation_items', ['id' => $item->id]);
    }

    public function test_administrator_can_reorder_navigation_items(): void
    {
        $first = NavigationItem::query()->where('placement', 'header')->where('route_key', 'artworks')->first();
        $second = NavigationItem::query()->where('placement', 'header')->where('route_key', 'artists')->first();

        $response = $this->actingAs($this->admin)->postJson('/admin/navigation/reorder', [
            'items' => [
                ['id' => $first->id, 'sort_order' => 1],
                ['id' => $second->id, 'sort_order' => 0],
            ],
        ]);

        $response->assertOk();
        $this->assertSame(1, $first->fresh()->sort_order);
        $this->assertSame(0, $second->fresh()->sort_order);
    }

    public function test_unauthenticated_requests_cannot_mutate_navigation(): void
    {
        $item = NavigationItem::query()->where('placement', 'header')->where('route_key', 'artworks')->first();

        $this->postJson('/admin/navigation', ['placement' => 'footer', 'nav_type' => 'route', 'route_key' => 'artists'])->assertStatus(401);
        $this->putJson("/admin/navigation/{$item->id}", ['is_visible' => false])->assertStatus(401);
        $this->deleteJson("/admin/navigation/{$item->id}")->assertStatus(401);
        $this->postJson('/admin/navigation/reorder', ['items' => [['id' => $item->id, 'sort_order' => 0]]])->assertStatus(401);
    }

    public function test_editor_can_manage_navigation(): void
    {
        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $this->actingAs($editor)->getJson('/admin/navigation')->assertOk();
    }
}
