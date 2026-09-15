<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\ExhibitionMedium;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExhibitionValidationTest extends TestCase
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

    private function validExhibitionPayload(array $overrides = []): array
    {
        return array_merge([
            'type' => 'exhibition',
            'status' => 'upcoming',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-exhibition-'.uniqid(), 'title' => 'Test', 'venue' => 'Gallery', 'short_text' => 'Short', 'full_text' => 'Full'],
            ],
        ], $overrides);
    }

    private function createExhibition(array $payload)
    {
        return $this->actingAs($this->admin)->postJson('/admin/exhibitions', $payload);
    }

    public function test_mass_assignment_is_not_possible_via_unexpected_fields(): void
    {
        $response = $this->createExhibition($this->validExhibitionPayload(['id' => 999, 'created_at' => '2000-01-01T00:00:00Z']));

        $response->assertOk();
        $this->assertNotSame(999, $response->json('data.id') ?? $response->json('id'));
        $this->assertNotSame('2000-01-01T00:00:00+00:00', $response->json('data.created_at') ?? $response->json('created_at'));
    }

    public function test_nonexistent_artist_id_is_rejected(): void
    {
        $payload = $this->validExhibitionPayload(['artists' => [['artist_id' => 999999, 'sort_order' => 0]]]);

        $this->createExhibition($payload)->assertStatus(422);
    }

    public function test_nonexistent_artwork_id_is_rejected(): void
    {
        $payload = $this->validExhibitionPayload(['artworks' => [['artwork_id' => 999999, 'sort_order' => 0]]]);

        $this->createExhibition($payload)->assertStatus(422);
    }

    public function test_nonexistent_media_id_is_rejected(): void
    {
        $payload = $this->validExhibitionPayload(['media' => [['media_id' => 999999, 'type' => 'photo', 'sort_order' => 0]]]);

        $this->createExhibition($payload)->assertStatus(422);
    }

    public function test_end_date_before_start_date_is_rejected_on_create(): void
    {
        $payload = $this->validExhibitionPayload(['start_date' => '2026-10-31', 'end_date' => '2026-10-01']);

        $this->createExhibition($payload)->assertStatus(422);
    }

    public function test_end_date_before_start_date_is_rejected_on_update(): void
    {
        $exhibition = Exhibition::factory()->create(['start_date' => '2026-10-01', 'end_date' => '2026-10-31']);

        $response = $this->actingAs($this->admin)->putJson("/admin/exhibitions/{$exhibition->id}", [
            'end_date' => '2026-09-01',
        ]);

        $response->assertStatus(422);
    }

    public function test_invalid_type_value_is_rejected(): void
    {
        $this->createExhibition($this->validExhibitionPayload(['type' => 'invalid-type']))->assertStatus(422);
    }

    public function test_invalid_status_value_is_rejected(): void
    {
        $this->createExhibition($this->validExhibitionPayload(['status' => 'invalid-status']))->assertStatus(422);
    }

    public function test_duplicate_translation_locale_within_one_payload_is_rejected(): void
    {
        $payload = $this->validExhibitionPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'slug-one', 'title' => 'Title One', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F'],
                ['locale' => 'az', 'slug' => 'slug-two', 'title' => 'Title Two', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F'],
            ],
        ]);

        $this->createExhibition($payload)->assertStatus(422);
    }

    public function test_duplicate_localized_slug_within_one_payload_is_rejected(): void
    {
        $payload = $this->validExhibitionPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'same-slug', 'title' => 'Title One', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F'],
                ['locale' => 'en', 'slug' => 'same-slug', 'title' => 'Title Two', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F'],
            ],
        ]);

        // Different locales with the same slug within one payload are fine.
        $this->createExhibition($payload)->assertOk();
    }

    public function test_duplicate_localized_slug_same_locale_within_one_payload_is_rejected(): void
    {
        $payload = $this->validExhibitionPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'same-slug', 'title' => 'Title One', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F'],
                ['locale' => 'az', 'slug' => 'same-slug', 'title' => 'Title Two', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F'],
            ],
        ]);

        $this->createExhibition($payload)->assertStatus(422);
    }

    public function test_duplicate_localized_slug_against_another_exhibition_is_rejected(): void
    {
        $this->createExhibition($this->validExhibitionPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'existing-slug', 'title' => 'Existing', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F'],
            ],
        ]))->assertOk();

        $response = $this->createExhibition($this->validExhibitionPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'existing-slug', 'title' => 'New', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F'],
            ],
        ]));

        $response->assertStatus(422);
    }

    public function test_duplicate_artist_id_within_artists_array_is_rejected(): void
    {
        $artist = Artist::factory()->create();

        $payload = $this->validExhibitionPayload([
            'artists' => [
                ['artist_id' => $artist->id, 'sort_order' => 0],
                ['artist_id' => $artist->id, 'sort_order' => 1],
            ],
        ]);

        $this->createExhibition($payload)->assertStatus(422);
    }

    public function test_duplicate_artwork_id_within_artworks_array_is_rejected(): void
    {
        $artwork = Artwork::factory()->create();

        $payload = $this->validExhibitionPayload([
            'artworks' => [
                ['artwork_id' => $artwork->id, 'sort_order' => 0],
                ['artwork_id' => $artwork->id, 'sort_order' => 1],
            ],
        ]);

        $this->createExhibition($payload)->assertStatus(422);
    }

    public function test_cross_exhibition_media_manipulation_is_rejected(): void
    {
        $media = Media::factory()->create();

        $exhibitionA = Exhibition::factory()->create();
        $exhibitionB = Exhibition::factory()->create();
        $mediumB = ExhibitionMedium::create([
            'exhibition_id' => $exhibitionB->id, 'media_id' => $media->id, 'type' => 'photo', 'sort_order' => 0,
        ]);

        $response = $this->actingAs($this->admin)->putJson("/admin/exhibitions/{$exhibitionA->id}", [
            'media' => [['id' => $mediumB->id, 'media_id' => $media->id, 'type' => 'photo', 'sort_order' => 0]],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('exhibition_media', ['id' => $mediumB->id, 'exhibition_id' => $exhibitionB->id]);
    }
}
