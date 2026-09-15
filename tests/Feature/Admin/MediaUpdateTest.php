<?php

namespace Tests\Feature\Admin;

use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MediaUpdateTest extends TestCase
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

    public function test_unauthenticated_update_is_denied(): void
    {
        $media = Media::factory()->create();

        $this->putJson("/admin/media/{$media->id}", ['alt_text' => ['az' => 'x']])->assertStatus(401);
    }

    public function test_updates_az_and_en_alt_text(): void
    {
        $media = Media::factory()->create();

        $response = $this->actingAs($this->admin)->putJson("/admin/media/{$media->id}", [
            'alt_text' => ['az' => 'Kətan üzərində', 'en' => 'On canvas'],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('media_translations', ['media_id' => $media->id, 'locale' => 'az', 'alt_text' => 'Kətan üzərində']);
        $this->assertDatabaseHas('media_translations', ['media_id' => $media->id, 'locale' => 'en', 'alt_text' => 'On canvas']);
    }

    public function test_translation_uniqueness_per_locale_is_preserved_on_repeated_updates(): void
    {
        $media = Media::factory()->create();

        $this->actingAs($this->admin)->putJson("/admin/media/{$media->id}", ['alt_text' => ['az' => 'First']]);
        $this->actingAs($this->admin)->putJson("/admin/media/{$media->id}", ['alt_text' => ['az' => 'Second']]);

        $this->assertDatabaseCount('media_translations', 1);
        $this->assertDatabaseHas('media_translations', ['media_id' => $media->id, 'locale' => 'az', 'alt_text' => 'Second']);
    }

    public function test_authoritative_metadata_cannot_be_overwritten_via_update(): void
    {
        $media = Media::factory()->create(['mime_type' => 'image/jpeg', 'original_width' => 500]);

        $response = $this->actingAs($this->admin)->putJson("/admin/media/{$media->id}", [
            'alt_text' => ['az' => 'ok'],
            'mime_type' => 'application/x-php',
            'original_width' => 99999,
            'disk' => 'evil-disk',
            'path' => '/etc/passwd',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('media', ['id' => $media->id, 'mime_type' => 'image/jpeg', 'original_width' => 500]);
    }
}
