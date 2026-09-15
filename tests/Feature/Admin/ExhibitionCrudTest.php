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
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ExhibitionCrudTest extends TestCase
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

    private function data(TestResponse $response): array
    {
        return $response->json('data') ?? $response->json();
    }

    public function test_create_with_translations_artists_artworks_and_media_returns_all_of_it_back(): void
    {
        $artist = Artist::factory()->create();
        $artwork = Artwork::factory()->create();
        $media = Media::factory()->create();

        $payload = $this->validExhibitionPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'az-slug-'.uniqid(), 'title' => 'AZ Title', 'venue' => 'AZ Venue', 'short_text' => 'S', 'full_text' => 'F'],
                ['locale' => 'en', 'slug' => 'en-slug-'.uniqid(), 'title' => 'EN Title', 'venue' => 'EN Venue', 'short_text' => 'S', 'full_text' => 'F'],
            ],
            'artists' => [
                ['artist_id' => $artist->id, 'sort_order' => 0],
            ],
            'artworks' => [
                ['artwork_id' => $artwork->id, 'sort_order' => 0],
            ],
            'media' => [
                ['media_id' => $media->id, 'type' => 'photo', 'sort_order' => 0],
            ],
        ]);

        $response = $this->actingAs($this->admin)->postJson('/admin/exhibitions', $payload);

        $response->assertOk();
        $data = $this->data($response);

        $this->assertCount(2, $data['translations']);
        $this->assertCount(1, $data['artists']);
        $this->assertSame($artist->id, $data['artists'][0]['id']);
        $this->assertCount(1, $data['artworks']);
        $this->assertSame($artwork->id, $data['artworks'][0]['id']);
        $this->assertCount(1, $data['media']);
        $this->assertSame($media->id, $data['media'][0]['media_id']);

        $this->assertDatabaseHas('exhibition_translations', ['exhibition_id' => $data['id'], 'locale' => 'az']);
        $this->assertDatabaseHas('exhibition_translations', ['exhibition_id' => $data['id'], 'locale' => 'en']);
        $this->assertDatabaseHas('exhibition_artists', ['exhibition_id' => $data['id'], 'artist_id' => $artist->id]);
        $this->assertDatabaseHas('exhibition_artworks', ['exhibition_id' => $data['id'], 'artwork_id' => $artwork->id]);
        $this->assertDatabaseHas('exhibition_media', ['exhibition_id' => $data['id'], 'media_id' => $media->id]);
    }

    public function test_update_with_only_one_locale_does_not_touch_the_other_locale(): void
    {
        $exhibition = Exhibition::factory()->create();
        $exhibition->translations()->create(['locale' => 'az', 'slug' => 'az-slug-'.uniqid(), 'title' => 'AZ Title', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);
        $exhibition->translations()->create(['locale' => 'en', 'slug' => 'en-slug-'.uniqid(), 'title' => 'EN Title', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $response = $this->actingAs($this->admin)->putJson("/admin/exhibitions/{$exhibition->id}", [
            'translations' => [
                ['locale' => 'az', 'slug' => 'az-slug-updated-'.uniqid(), 'title' => 'AZ Title Updated', 'venue' => 'V2', 'short_text' => 'S2', 'full_text' => 'F2'],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('exhibition_translations', ['exhibition_id' => $exhibition->id, 'locale' => 'en', 'title' => 'EN Title']);
        $this->assertDatabaseHas('exhibition_translations', ['exhibition_id' => $exhibition->id, 'locale' => 'az', 'title' => 'AZ Title Updated']);
    }

    public function test_update_replacing_artists_list_syncs_pivot_without_touching_artists_table(): void
    {
        $exhibition = Exhibition::factory()->create();
        $oldArtist = Artist::factory()->create();
        $newArtist = Artist::factory()->create();
        $exhibition->artists()->attach($oldArtist, ['sort_order' => 0]);

        $response = $this->actingAs($this->admin)->putJson("/admin/exhibitions/{$exhibition->id}", [
            'artists' => [
                ['artist_id' => $newArtist->id, 'sort_order' => 0],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseMissing('exhibition_artists', ['exhibition_id' => $exhibition->id, 'artist_id' => $oldArtist->id]);
        $this->assertDatabaseHas('exhibition_artists', ['exhibition_id' => $exhibition->id, 'artist_id' => $newArtist->id]);
        $this->assertDatabaseHas('artists', ['id' => $oldArtist->id]);
        $this->assertDatabaseHas('artists', ['id' => $newArtist->id]);
    }

    public function test_update_replacing_artworks_list_syncs_pivot_without_touching_artworks_table(): void
    {
        $exhibition = Exhibition::factory()->create();
        $oldArtwork = Artwork::factory()->create();
        $newArtwork = Artwork::factory()->create();
        $exhibition->artworks()->attach($oldArtwork, ['sort_order' => 0]);

        $response = $this->actingAs($this->admin)->putJson("/admin/exhibitions/{$exhibition->id}", [
            'artworks' => [
                ['artwork_id' => $newArtwork->id, 'sort_order' => 0],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseMissing('exhibition_artworks', ['exhibition_id' => $exhibition->id, 'artwork_id' => $oldArtwork->id]);
        $this->assertDatabaseHas('exhibition_artworks', ['exhibition_id' => $exhibition->id, 'artwork_id' => $newArtwork->id]);
        $this->assertDatabaseHas('artworks', ['id' => $oldArtwork->id]);
        $this->assertDatabaseHas('artworks', ['id' => $newArtwork->id]);
    }

    public function test_update_replacing_media_removes_dropped_row_but_keeps_underlying_media(): void
    {
        $exhibition = Exhibition::factory()->create();
        $oldMedia = Media::factory()->create();
        $newMedia = Media::factory()->create();
        $oldExhibitionMedium = $exhibition->media()->create(['media_id' => $oldMedia->id, 'type' => 'photo', 'sort_order' => 0]);

        $response = $this->actingAs($this->admin)->putJson("/admin/exhibitions/{$exhibition->id}", [
            'media' => [
                ['media_id' => $newMedia->id, 'type' => 'photo', 'sort_order' => 0],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseMissing('exhibition_media', ['id' => $oldExhibitionMedium->id]);
        $this->assertDatabaseHas('exhibition_media', ['exhibition_id' => $exhibition->id, 'media_id' => $newMedia->id]);
        $this->assertDatabaseHas('media', ['id' => $oldMedia->id]);
        $this->assertDatabaseHas('media', ['id' => $newMedia->id]);
    }

    public function test_search_by_translated_title(): void
    {
        $matching = Exhibition::factory()->create();
        $matching->translations()->create(['locale' => 'az', 'slug' => 'unique-slug-'.uniqid(), 'title' => 'Sunset Over Baku', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $other = Exhibition::factory()->create();
        $other->translations()->create(['locale' => 'az', 'slug' => 'other-slug-'.uniqid(), 'title' => 'Unrelated', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $response = $this->actingAs($this->admin)->getJson('/admin/exhibitions?search=Sunset');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_filters_by_status_type_and_is_active(): void
    {
        $match = Exhibition::factory()->create(['status' => 'current', 'type' => 'exhibition', 'is_active' => true]);
        Exhibition::factory()->create(['status' => 'past', 'type' => 'news', 'is_active' => false]);

        $response = $this->actingAs($this->admin)->getJson('/admin/exhibitions?status=current&type=exhibition&is_active=1');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($match->id));
        $this->assertCount(1, $ids);
    }

    public function test_pagination_returns_correct_page_shape(): void
    {
        Exhibition::factory()->count(25)->create();

        $response = $this->actingAs($this->admin)->getJson('/admin/exhibitions?per_page=10');

        $response->assertOk();
        $this->assertCount(10, $response->json('data'));
        $this->assertSame(25, $response->json('meta.total'));
        $this->assertSame(3, $response->json('meta.last_page'));
    }
}
