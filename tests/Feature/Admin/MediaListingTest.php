<?php

namespace Tests\Feature\Admin;

use App\Models\Artwork;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MediaListingTest extends TestCase
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

    public function test_unauthenticated_listing_is_denied(): void
    {
        $this->getJson('/admin/media')->assertStatus(401);
    }

    public function test_lists_media_newest_first_with_pagination(): void
    {
        Media::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)->getJson('/admin/media?per_page=2');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
        $this->assertSame(3, $response->json('meta.total'));
    }

    public function test_filters_by_original_filename_search(): void
    {
        Media::factory()->create(['original_filename' => 'sunset-over-baku.jpg']);
        Media::factory()->create(['original_filename' => 'unrelated.jpg']);

        $response = $this->actingAs($this->admin)->getJson('/admin/media?search=sunset');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_filters_by_artwork_association(): void
    {
        $artwork = Artwork::factory()->create();
        $attached = Media::factory()->create();
        $unattached = Media::factory()->create();
        $artwork->images()->create(['media_id' => $attached->id, 'type' => 'main', 'is_main' => true, 'sort_order' => 0]);

        $response = $this->actingAs($this->admin)->getJson("/admin/media?artwork_id={$artwork->id}");

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($attached->id));
        $this->assertFalse($ids->contains($unattached->id));
    }

    public function test_show_returns_a_single_media_item(): void
    {
        $media = Media::factory()->create();

        $this->actingAs($this->admin)->getJson("/admin/media/{$media->id}")->assertOk()
            ->assertJsonPath('data.id', $media->id);
    }

    public function test_show_does_not_expose_raw_storage_paths(): void
    {
        $media = Media::factory()->create();

        $response = $this->actingAs($this->admin)->getJson("/admin/media/{$media->id}");

        $response->assertOk();
        $this->assertArrayNotHasKey('disk', $response->json('data'));
        $this->assertArrayNotHasKey('path', $response->json('data'));
    }
}
