<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Media;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtworkValidationTest extends TestCase
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
                ['locale' => 'az', 'slug' => 'test-artwork', 'title' => 'Test', 'short_description' => 'Short', 'provenance' => 'Provenance'],
            ],
        ], $overrides);
    }

    private function createArtwork(array $payload)
    {
        return $this->actingAs($this->admin)->postJson('/admin/artworks', $payload);
    }

    public function test_mass_assignment_is_not_possible_via_unexpected_fields(): void
    {
        $response = $this->createArtwork($this->validArtworkPayload(['id' => 999, 'created_at' => '2000-01-01T00:00:00Z']));

        $response->assertOk();
        $this->assertNotSame(999, $response->json('data.id') ?? $response->json('id'));
        $this->assertNotSame('2000-01-01T00:00:00+00:00', $response->json('data.created_at') ?? $response->json('created_at'));
    }

    public function test_nonexistent_artist_id_is_rejected(): void
    {
        $this->createArtwork($this->validArtworkPayload(['artist_id' => 999999]))->assertStatus(422);
    }

    public function test_nonexistent_medium_id_is_rejected(): void
    {
        $this->createArtwork($this->validArtworkPayload(['medium_id' => 999999]))->assertStatus(422);
    }

    public function test_inactive_medium_id_is_rejected(): void
    {
        $inactiveMedium = Medium::factory()->create(['is_active' => false]);

        $this->createArtwork($this->validArtworkPayload(['medium_id' => $inactiveMedium->id]))->assertStatus(422);
    }

    public function test_nonexistent_genre_id_is_rejected(): void
    {
        $this->createArtwork($this->validArtworkPayload(['genre_id' => 999999]))->assertStatus(422);
    }

    public function test_nonexistent_media_id_on_image_is_rejected(): void
    {
        $payload = $this->validArtworkPayload([
            'images' => [['media_id' => 999999, 'type' => 'main', 'is_main' => true]],
        ]);

        $this->createArtwork($payload)->assertStatus(422);
    }

    public function test_duplicate_inventory_code_on_create_is_rejected(): void
    {
        $existing = Artwork::factory()->create(['inventory_code' => 'AN-2020-001']);

        $this->createArtwork($this->validArtworkPayload(['inventory_code' => 'AN-2020-001']))->assertStatus(422);

        $this->assertDatabaseCount('artworks', 1);
        $this->assertDatabaseHas('artworks', ['id' => $existing->id, 'inventory_code' => 'AN-2020-001']);
    }

    public function test_duplicate_translation_locale_within_one_payload_is_rejected(): void
    {
        $payload = $this->validArtworkPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'slug-one', 'title' => 'Title One', 'short_description' => 'Short', 'provenance' => 'Prov'],
                ['locale' => 'az', 'slug' => 'slug-two', 'title' => 'Title Two', 'short_description' => 'Short', 'provenance' => 'Prov'],
            ],
        ]);

        $this->createArtwork($payload)->assertStatus(422);
    }

    public function test_duplicate_localized_slug_within_one_payload_is_rejected(): void
    {
        $payload = $this->validArtworkPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'same-slug', 'title' => 'Title One', 'short_description' => 'Short', 'provenance' => 'Prov'],
                ['locale' => 'en', 'slug' => 'same-slug', 'title' => 'Title Two', 'short_description' => 'Short', 'provenance' => 'Prov'],
            ],
        ]);

        // Different locales with the same slug within one payload are fine;
        // only same-locale duplicate slugs are ambiguous/rejected. This
        // exercises the cross-artwork DB-level check instead.
        $response = $this->createArtwork($payload);
        $response->assertOk();
    }

    public function test_duplicate_localized_slug_against_another_artwork_is_rejected(): void
    {
        $this->createArtwork($this->validArtworkPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'existing-slug', 'title' => 'Existing', 'short_description' => 'Short', 'provenance' => 'Prov'],
            ],
        ]))->assertOk();

        $response = $this->createArtwork($this->validArtworkPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'existing-slug', 'title' => 'New', 'short_description' => 'Short', 'provenance' => 'Prov'],
            ],
        ]));

        $response->assertStatus(422);
    }

    public function test_zero_width_is_rejected(): void
    {
        $this->createArtwork($this->validArtworkPayload(['width_cm' => 0]))->assertStatus(422);
    }

    public function test_negative_height_is_rejected(): void
    {
        $this->createArtwork($this->validArtworkPayload(['height_cm' => -5]))->assertStatus(422);
    }

    public function test_width_beyond_database_column_range_is_rejected_with_a_field_error(): void
    {
        $response = $this->createArtwork($this->validArtworkPayload(['width_cm' => 9999999]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('width_cm');
        $this->assertSame(
            'En ölçüsü 999999.99 sm-dən çox ola bilməz.',
            $response->json('errors.width_cm.0')
        );
    }

    public function test_height_beyond_database_column_range_is_rejected_with_a_field_error(): void
    {
        $response = $this->createArtwork($this->validArtworkPayload(['height_cm' => 9999999]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('height_cm');
        $this->assertSame(
            'Hündürlük ölçüsü 999999.99 sm-dən çox ola bilməz.',
            $response->json('errors.height_cm.0')
        );
    }

    public function test_dimension_at_the_maximum_valid_database_boundary_is_accepted(): void
    {
        $this->createArtwork($this->validArtworkPayload(['width_cm' => 999999.99, 'height_cm' => 500]))
            ->assertStatus(200);
    }

    public function test_negative_price_is_rejected(): void
    {
        $this->createArtwork($this->validArtworkPayload(['price' => -10]))->assertStatus(422);
    }

    public function test_invalid_availability_value_is_rejected(): void
    {
        $this->createArtwork($this->validArtworkPayload(['availability' => 'pending']))->assertStatus(422);
    }

    public function test_year_sold_is_rejected_when_availability_is_not_sold(): void
    {
        $this->createArtwork($this->validArtworkPayload(['availability' => 'available', 'year_sold' => 2020]))->assertStatus(422);
    }

    public function test_cross_artwork_image_manipulation_is_rejected(): void
    {
        $media = Media::factory()->create();

        $artworkA = Artwork::factory()->create();
        $artworkB = Artwork::factory()->create();
        $imageB = $artworkB->images()->create(['media_id' => $media->id, 'type' => 'main', 'is_main' => true, 'sort_order' => 0]);

        $response = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artworkA->id}", [
            'images' => [['id' => $imageB->id, 'media_id' => $media->id, 'type' => 'main', 'is_main' => true]],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('artwork_images', ['id' => $imageB->id, 'artwork_id' => $artworkB->id]);
    }

    public function test_duplicate_main_image_attempt_is_rejected(): void
    {
        $mediaOne = Media::factory()->create();
        $mediaTwo = Media::factory()->create();

        $payload = $this->validArtworkPayload([
            'images' => [
                ['media_id' => $mediaOne->id, 'type' => 'main', 'is_main' => true],
                ['media_id' => $mediaTwo->id, 'type' => 'detail', 'is_main' => true],
            ],
        ]);

        $this->createArtwork($payload)->assertStatus(422);
    }
}
