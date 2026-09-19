<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtworkYoutubeVideoTest extends TestCase
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

    public function test_creating_an_artwork_with_a_valid_youtube_url_stores_only_the_extracted_id(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]));

        $response->assertOk();
        $id = $response->json('data.id');

        $this->assertDatabaseHas('artworks', ['id' => $id, 'youtube_video_id' => 'dQw4w9WgXcQ']);
        $this->assertSame('dQw4w9WgXcQ', $response->json('data.youtube_video_id'));
        $this->assertSame('https://www.youtube.com/watch?v=dQw4w9WgXcQ', $response->json('data.youtube_url'));
    }

    public function test_shorts_url_is_accepted(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'youtube_url' => 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        ]));

        $response->assertOk();
        $this->assertDatabaseHas('artworks', ['id' => $response->json('data.id'), 'youtube_video_id' => 'dQw4w9WgXcQ']);
    }

    public function test_invalid_youtube_url_is_rejected_and_nothing_is_created(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'youtube_url' => 'https://vimeo.com/12345',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_url');
        $this->assertDatabaseCount('artworks', 0);
    }

    public function test_raw_iframe_html_is_rejected(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'youtube_url' => '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_url');
    }

    public function test_javascript_scheme_is_rejected(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'youtube_url' => 'javascript:alert(1)',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_url');
    }

    public function test_admin_can_update_the_video_on_an_existing_artwork(): void
    {
        $artwork = Artwork::factory()->create(['youtube_video_id' => 'oldVideoId']);

        $response = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artwork->id}", [
            'youtube_url' => 'https://youtu.be/dQw4w9WgXcQ',
        ]);

        $response->assertOk();
        $this->assertSame('dQw4w9WgXcQ', $artwork->fresh()->youtube_video_id);
    }

    public function test_admin_can_remove_the_video_by_sending_an_empty_url(): void
    {
        $artwork = Artwork::factory()->create(['youtube_video_id' => 'dQw4w9WgXcQ']);

        $response = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artwork->id}", [
            'youtube_url' => '',
        ]);

        $response->assertOk();
        $this->assertNull($artwork->fresh()->youtube_video_id);
    }

    public function test_updating_other_fields_without_touching_youtube_url_leaves_the_video_unchanged(): void
    {
        $artwork = Artwork::factory()->create(['youtube_video_id' => 'dQw4w9WgXcQ']);

        $response = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artwork->id}", [
            'featured' => true,
        ]);

        $response->assertOk();
        $this->assertSame('dQw4w9WgXcQ', $artwork->fresh()->youtube_video_id);
    }

    public function test_sending_youtube_video_id_directly_without_a_matching_url_is_still_charset_validated(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'youtube_video_id' => '"><script>',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_video_id');
        $this->assertDatabaseCount('artworks', 0);
    }

    public function test_no_video_key_present_when_artwork_has_no_video(): void
    {
        $artwork = Artwork::factory()->create(['youtube_video_id' => null]);

        $response = $this->actingAs($this->admin)->getJson("/admin/artworks/{$artwork->id}");

        $response->assertOk();
        $this->assertNull($response->json('data.youtube_video_id'));
        $this->assertNull($response->json('data.youtube_url'));
    }
}
