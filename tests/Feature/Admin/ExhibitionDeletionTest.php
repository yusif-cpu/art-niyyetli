<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExhibitionDeletionTest extends TestCase
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

    public function test_delete_on_upcoming_exhibition_soft_deletes_it(): void
    {
        $exhibition = Exhibition::factory()->create(['status' => 'upcoming']);

        $this->actingAs($this->admin)->deleteJson("/admin/exhibitions/{$exhibition->id}")->assertOk();

        $this->assertSoftDeleted('exhibitions', ['id' => $exhibition->id]);
        $this->actingAs($this->admin)->getJson("/admin/exhibitions/{$exhibition->id}")->assertStatus(404);
    }

    public function test_delete_on_current_exhibition_soft_deletes_it(): void
    {
        $exhibition = Exhibition::factory()->create(['status' => 'current']);

        $this->actingAs($this->admin)->deleteJson("/admin/exhibitions/{$exhibition->id}")->assertOk();

        $this->assertSoftDeleted('exhibitions', ['id' => $exhibition->id]);
        $this->actingAs($this->admin)->getJson("/admin/exhibitions/{$exhibition->id}")->assertStatus(404);
    }

    public function test_delete_on_past_exhibition_is_refused(): void
    {
        $exhibition = Exhibition::factory()->create(['status' => 'past']);

        $this->actingAs($this->admin)->deleteJson("/admin/exhibitions/{$exhibition->id}")->assertStatus(409);

        $this->assertDatabaseHas('exhibitions', ['id' => $exhibition->id, 'deleted_at' => null]);
    }

    public function test_delete_on_exhibition_with_attached_artists_artworks_and_media_does_not_delete_related_records(): void
    {
        $exhibition = Exhibition::factory()->create(['status' => 'upcoming']);
        $artist = Artist::factory()->create();
        $artwork = Artwork::factory()->create();
        $media = Media::factory()->create();

        $exhibition->artists()->attach($artist, ['sort_order' => 0]);
        $exhibition->artworks()->attach($artwork, ['sort_order' => 0]);
        $exhibitionMedium = $exhibition->media()->create(['media_id' => $media->id, 'type' => 'photo', 'sort_order' => 0]);

        $this->actingAs($this->admin)->deleteJson("/admin/exhibitions/{$exhibition->id}")->assertOk();

        $this->assertSoftDeleted('exhibitions', ['id' => $exhibition->id]);

        // Related records are untouched by the soft delete.
        $this->assertDatabaseHas('artists', ['id' => $artist->id]);
        $this->assertDatabaseHas('artworks', ['id' => $artwork->id]);
        $this->assertDatabaseHas('media', ['id' => $media->id]);

        // Soft delete does not trigger the FK cascade, so pivot/media rows remain findable too.
        $this->assertDatabaseHas('exhibition_artists', ['exhibition_id' => $exhibition->id, 'artist_id' => $artist->id]);
        $this->assertDatabaseHas('exhibition_artworks', ['exhibition_id' => $exhibition->id, 'artwork_id' => $artwork->id]);
        $this->assertDatabaseHas('exhibition_media', ['id' => $exhibitionMedium->id, 'exhibition_id' => $exhibition->id]);
    }
}
