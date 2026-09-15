<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\ArtworkImage;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaArtworkIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);
        Storage::fake('local');
        Storage::fake('public');

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    private function uploadMedia(string $name = 'artwork.jpg'): int
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/media', [
            'file' => UploadedFile::fake()->image($name, 1000, 800),
        ]);

        return $response->json('data.id');
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

    private function data($response): array
    {
        return $response->json('data') ?? $response->json();
    }

    public function test_uploaded_media_can_be_attached_to_an_artwork_as_main_image(): void
    {
        $mediaId = $this->uploadMedia();

        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'images' => [['media_id' => $mediaId, 'type' => 'main', 'is_main' => true, 'sort_order' => 0]],
        ]));

        $response->assertOk();
        $data = $this->data($response);

        $this->assertSame($mediaId, $data['main_image']['media_id']);
        $this->assertNotNull($data['main_image']['url']);
        $this->assertArrayNotHasKey('disk', $data['main_image']);
        $this->assertArrayNotHasKey('path', $data['main_image']);
    }

    public function test_main_image_swap_and_reorder_still_work_with_uploaded_media(): void
    {
        $mediaOne = $this->uploadMedia('one.jpg');
        $mediaTwo = $this->uploadMedia('two.jpg');

        $created = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'images' => [
                ['media_id' => $mediaOne, 'type' => 'main', 'is_main' => true, 'sort_order' => 0],
                ['media_id' => $mediaTwo, 'type' => 'detail', 'is_main' => false, 'sort_order' => 1],
            ],
        ]));
        $artworkId = $this->data($created)['id'];
        $imageOneId = ArtworkImage::where('media_id', $mediaOne)->first()->id;
        $imageTwoId = ArtworkImage::where('media_id', $mediaTwo)->first()->id;

        $updated = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artworkId}", [
            'images' => [
                ['id' => $imageOneId, 'media_id' => $mediaOne, 'type' => 'detail', 'is_main' => false, 'sort_order' => 1],
                ['id' => $imageTwoId, 'media_id' => $mediaTwo, 'type' => 'main', 'is_main' => true, 'sort_order' => 0],
            ],
        ]);

        $updated->assertOk();
        $updatedData = $this->data($updated);
        $this->assertSame($mediaTwo, $updatedData['main_image']['media_id']);
        $this->assertSame($mediaTwo, $updatedData['images'][0]['media_id']);
    }

    public function test_cross_artwork_manipulation_is_still_rejected_with_uploaded_media(): void
    {
        $mediaId = $this->uploadMedia();

        $artworkA = $this->data($this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload()))['id'];
        $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'images' => [['media_id' => $mediaId, 'type' => 'main', 'is_main' => true, 'sort_order' => 0]],
        ]));
        $imageId = ArtworkImage::where('media_id', $mediaId)->first()->id;

        $response = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artworkA}", [
            'images' => [['id' => $imageId, 'media_id' => $mediaId, 'type' => 'main', 'is_main' => true]],
        ]);

        $response->assertStatus(422);
    }
}
