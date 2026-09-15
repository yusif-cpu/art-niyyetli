<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\ExhibitionMedium;
use App\Models\Media;
use App\Models\Role;
use App\Models\SeoMetadata;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaDeletionTest extends TestCase
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

    public function test_unauthenticated_delete_is_denied(): void
    {
        $media = Media::factory()->create();

        $this->deleteJson("/admin/media/{$media->id}")->assertStatus(401);
    }

    public function test_unreferenced_media_can_be_soft_deleted_and_variants_are_preserved(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $mediaId = $this->actingAs($this->admin)->postJson('/admin/media', [
            'file' => UploadedFile::fake()->image('artwork.jpg', 800, 600),
        ])->json('data.id');

        $this->actingAs($this->admin)->deleteJson("/admin/media/{$mediaId}")->assertOk();

        $this->assertSoftDeleted('media', ['id' => $mediaId]);
        $this->actingAs($this->admin)->getJson("/admin/media/{$mediaId}")->assertStatus(404);
        // Variant rows are intentionally preserved (not deleted) alongside a
        // soft-deleted Media row — see the plan's Global Constraints; this is
        // a documented Phase 06 purge candidate, not an oversight.
        $this->assertDatabaseHas('media_variants', ['media_id' => $mediaId]);
    }

    public function test_media_referenced_by_an_artwork_image_cannot_be_deleted(): void
    {
        $media = Media::factory()->create();
        $artwork = Artwork::factory()->create();
        $artwork->images()->create(['media_id' => $media->id, 'type' => 'main', 'is_main' => true, 'sort_order' => 0]);

        $this->actingAs($this->admin)->deleteJson("/admin/media/{$media->id}")->assertStatus(409);
        $this->assertDatabaseHas('media', ['id' => $media->id, 'deleted_at' => null]);
    }

    public function test_media_used_as_artist_representation_image_cannot_be_deleted(): void
    {
        $media = Media::factory()->create();
        Artist::factory()->create(['representation_image_id' => $media->id]);

        $this->actingAs($this->admin)->deleteJson("/admin/media/{$media->id}")->assertStatus(409);
        $this->assertDatabaseHas('media', ['id' => $media->id, 'deleted_at' => null]);
    }

    public function test_media_used_in_exhibition_media_cannot_be_deleted(): void
    {
        $media = Media::factory()->create();
        $exhibition = Exhibition::factory()->create();
        ExhibitionMedium::create(['exhibition_id' => $exhibition->id, 'media_id' => $media->id, 'type' => 'photo', 'sort_order' => 0]);

        $this->actingAs($this->admin)->deleteJson("/admin/media/{$media->id}")->assertStatus(409);
        $this->assertDatabaseHas('media', ['id' => $media->id, 'deleted_at' => null]);
    }

    public function test_media_used_as_seo_og_image_cannot_be_deleted(): void
    {
        $media = Media::factory()->create();
        $artwork = Artwork::factory()->create();
        SeoMetadata::create([
            'seoable_type' => Artwork::class, 'seoable_id' => $artwork->id,
            'locale' => 'az', 'title' => 'T', 'description' => 'D', 'og_image_id' => $media->id,
        ]);

        $this->actingAs($this->admin)->deleteJson("/admin/media/{$media->id}")->assertStatus(409);
        $this->assertDatabaseHas('media', ['id' => $media->id, 'deleted_at' => null]);
    }
}
