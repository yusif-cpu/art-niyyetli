<?php

namespace Tests\Feature\Admin;

use App\Models\Artwork;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtworkReorderTest extends TestCase
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

    public function test_reorder_persists_the_new_sort_order_for_each_artwork(): void
    {
        $a = Artwork::factory()->create(['sort_order' => 0]);
        $b = Artwork::factory()->create(['sort_order' => 1]);
        $c = Artwork::factory()->create(['sort_order' => 2]);

        $response = $this->actingAs($this->admin)->postJson('/admin/artworks/reorder', [
            'items' => [
                ['id' => $a->id, 'sort_order' => 2],
                ['id' => $b->id, 'sort_order' => 0],
                ['id' => $c->id, 'sort_order' => 1],
            ],
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('artworks', ['id' => $a->id, 'sort_order' => 2]);
        $this->assertDatabaseHas('artworks', ['id' => $b->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('artworks', ['id' => $c->id, 'sort_order' => 1]);
    }

    public function test_reorder_with_a_nonexistent_artwork_id_rejects_the_whole_request(): void
    {
        $a = Artwork::factory()->create(['sort_order' => 0]);

        $response = $this->actingAs($this->admin)->postJson('/admin/artworks/reorder', [
            'items' => [
                ['id' => $a->id, 'sort_order' => 5],
                ['id' => 999999, 'sort_order' => 0],
            ],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('artworks', ['id' => $a->id, 'sort_order' => 0]);
    }

    public function test_reorder_with_a_duplicate_id_is_rejected(): void
    {
        $a = Artwork::factory()->create();

        $response = $this->actingAs($this->admin)->postJson('/admin/artworks/reorder', [
            'items' => [
                ['id' => $a->id, 'sort_order' => 1],
                ['id' => $a->id, 'sort_order' => 2],
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_unauthenticated_reorder_attempt_is_rejected(): void
    {
        $a = Artwork::factory()->create();

        $this->postJson('/admin/artworks/reorder', [
            'items' => [['id' => $a->id, 'sort_order' => 1]],
        ])->assertStatus(401);
    }
}
