<?php

namespace Tests\Feature\Admin;

use App\Models\Exhibition;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExhibitionYoutubeVideoTest extends TestCase
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

    public function test_creating_an_exhibition_with_a_valid_youtube_url_stores_only_the_extracted_id(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/exhibitions', $this->validExhibitionPayload([
            'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]));

        $response->assertOk();
        $id = $response->json('data.id');

        $this->assertDatabaseHas('exhibitions', ['id' => $id, 'youtube_video_id' => 'dQw4w9WgXcQ']);
        $this->assertSame('dQw4w9WgXcQ', $response->json('data.youtube_video_id'));
    }

    public function test_invalid_youtube_url_is_rejected_and_nothing_is_created(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/exhibitions', $this->validExhibitionPayload([
            'youtube_url' => 'not a url at all ###',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_url');
        $this->assertDatabaseCount('exhibitions', 0);
    }

    public function test_raw_script_tag_is_rejected(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/exhibitions', $this->validExhibitionPayload([
            'youtube_url' => '<script>alert(1)</script>',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_url');
    }

    public function test_sending_youtube_video_id_directly_without_a_matching_url_is_still_charset_validated(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/exhibitions', $this->validExhibitionPayload([
            'youtube_video_id' => '"><script>',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_video_id');
        $this->assertDatabaseCount('exhibitions', 0);
    }

    public function test_admin_can_update_and_then_remove_the_video(): void
    {
        $exhibition = Exhibition::factory()->create(['youtube_video_id' => null]);

        $set = $this->actingAs($this->admin)->putJson("/admin/exhibitions/{$exhibition->id}", [
            'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);
        $set->assertOk();
        $this->assertSame('dQw4w9WgXcQ', $exhibition->fresh()->youtube_video_id);

        $removed = $this->actingAs($this->admin)->putJson("/admin/exhibitions/{$exhibition->id}", [
            'youtube_url' => '',
        ]);
        $removed->assertOk();
        $this->assertNull($exhibition->fresh()->youtube_video_id);
    }

    public function test_updating_other_fields_without_touching_youtube_url_leaves_the_video_unchanged(): void
    {
        $exhibition = Exhibition::factory()->create(['youtube_video_id' => 'dQw4w9WgXcQ']);

        $response = $this->actingAs($this->admin)->putJson("/admin/exhibitions/{$exhibition->id}", [
            'is_active' => false,
        ]);

        $response->assertOk();
        $this->assertSame('dQw4w9WgXcQ', $exhibition->fresh()->youtube_video_id);
    }
}
