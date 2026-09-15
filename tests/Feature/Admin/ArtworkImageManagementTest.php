<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\ArtworkImage;
use App\Models\Genre;
use App\Models\Media;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ArtworkImageManagementTest extends TestCase
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

    private function validArtworkPayload(array $overrides = []): array
    {
        return array_merge([
            'artist_id' => Artist::factory()->create()->id,
            'medium_id' => Medium::factory()->create()->id,
            'genre_id' => Genre::factory()->create()->id,
            'year_created' => 2020,
            'width_cm' => 50,
            'height_cm' => 70,
            'price' => 1500,
            'show_price' => true,
            'availability' => 'available',
            'certificate' => false,
            'featured' => false,
            'show_on_wall' => false,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-artwork-'.uniqid(), 'title' => 'Test', 'short_description' => 'Short', 'provenance' => 'Provenance'],
            ],
        ], $overrides);
    }

    private function data(TestResponse $response): array
    {
        return $response->json('data') ?? $response->json();
    }

    public function test_create_with_three_images_orders_them_and_reports_the_main_one(): void
    {
        $mediaOne = Media::factory()->create();
        $mediaTwo = Media::factory()->create();
        $mediaThree = Media::factory()->create();

        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'images' => [
                ['media_id' => $mediaTwo->id, 'type' => 'detail', 'sort_order' => 1, 'is_main' => false],
                ['media_id' => $mediaOne->id, 'type' => 'main', 'sort_order' => 0, 'is_main' => true],
                ['media_id' => $mediaThree->id, 'type' => 'frame', 'sort_order' => 2, 'is_main' => false],
            ],
        ]));

        $response->assertOk();
        $data = $this->data($response);

        $this->assertSame($mediaOne->id, $data['main_image']['media_id']);
        $this->assertCount(3, $data['images']);
        $this->assertSame($mediaOne->id, $data['images'][0]['media_id']);
        $this->assertSame($mediaTwo->id, $data['images'][1]['media_id']);
        $this->assertSame($mediaThree->id, $data['images'][2]['media_id']);
    }

    public function test_update_changes_the_main_image_and_only_one_row_stays_main(): void
    {
        $artwork = Artwork::factory()->create();
        $mediaOne = Media::factory()->create();
        $mediaTwo = Media::factory()->create();

        $imageOne = $artwork->images()->create(['media_id' => $mediaOne->id, 'type' => 'main', 'sort_order' => 0, 'is_main' => true]);
        $imageTwo = $artwork->images()->create(['media_id' => $mediaTwo->id, 'type' => 'detail', 'sort_order' => 1, 'is_main' => false]);

        $response = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artwork->id}", [
            'images' => [
                ['id' => $imageOne->id, 'media_id' => $mediaOne->id, 'type' => 'main', 'sort_order' => 0, 'is_main' => false],
                ['id' => $imageTwo->id, 'media_id' => $mediaTwo->id, 'type' => 'detail', 'sort_order' => 1, 'is_main' => true],
            ],
        ]);

        $response->assertOk();

        $this->assertSame(1, ArtworkImage::where('artwork_id', $artwork->id)->where('is_main', true)->count());
        $this->assertTrue(ArtworkImage::find($imageTwo->id)->is_main);
        $this->assertFalse(ArtworkImage::find($imageOne->id)->is_main);
    }

    public function test_update_omitting_a_previously_attached_image_removes_it(): void
    {
        $artwork = Artwork::factory()->create();
        $mediaOne = Media::factory()->create();
        $mediaTwo = Media::factory()->create();

        $imageOne = $artwork->images()->create(['media_id' => $mediaOne->id, 'type' => 'main', 'sort_order' => 0, 'is_main' => true]);
        $imageTwo = $artwork->images()->create(['media_id' => $mediaTwo->id, 'type' => 'detail', 'sort_order' => 1, 'is_main' => false]);

        $response = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artwork->id}", [
            'images' => [
                ['id' => $imageOne->id, 'media_id' => $mediaOne->id, 'type' => 'main', 'sort_order' => 0, 'is_main' => true],
            ],
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('artwork_images', ['id' => $imageOne->id]);
        $this->assertDatabaseMissing('artwork_images', ['id' => $imageTwo->id]);
    }

    public function test_attaching_nonexistent_media_id_is_rejected_and_creates_nothing(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'images' => [['media_id' => 999999, 'type' => 'main', 'is_main' => true]],
        ]));

        $response->assertStatus(422);
        $this->assertDatabaseCount('artwork_images', 0);
    }
}
