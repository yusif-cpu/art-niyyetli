<?php

namespace Tests\Feature\Admin;

use App\Models\Media;
use App\Models\MediaVariant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteSettingBrandingTest extends TestCase
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

    public function test_brand_text_and_display_mode_default_when_unset(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/admin/settings');

        $response->assertOk();
        $response->assertJsonPath('data.brand_text', 'ArtNiyyətli');
        $response->assertJsonPath('data.logo_display_mode', 'logo_text');
        $response->assertJsonPath('data.logo_media_id', null);
        $response->assertJsonPath('data.logo_url', null);
    }

    public function test_admin_can_set_a_logo_from_the_media_library(): void
    {
        $media = Media::factory()->create();

        $response = $this->actingAs($this->admin)->putJson('/admin/settings', [
            'logo_media_id' => $media->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.logo_media_id', (string) $media->id);
    }

    public function test_logo_url_resolves_from_the_thumbnail_variant(): void
    {
        $media = Media::factory()->create();
        MediaVariant::create([
            'media_id' => $media->id,
            'variant' => 'thumbnail-webp',
            'disk' => 'public',
            'path' => 'variants/logo-thumb.webp',
            'mime_type' => 'image/webp',
            'size_bytes' => 100,
            'width' => 300,
            'height' => 100,
        ]);

        $this->actingAs($this->admin)->putJson('/admin/settings', ['logo_media_id' => $media->id])->assertOk();

        $response = $this->actingAs($this->admin)->getJson('/admin/settings');

        $response->assertOk();
        $this->assertStringContainsString('logo-thumb.webp', $response->json('data.logo_url'));
    }

    public function test_logo_url_gracefully_resolves_to_null_when_the_referenced_media_is_later_soft_deleted(): void
    {
        $media = Media::factory()->create();
        $this->actingAs($this->admin)->putJson('/admin/settings', ['logo_media_id' => $media->id])->assertOk();

        $media->delete();

        $response = $this->actingAs($this->admin)->getJson('/admin/settings');

        $response->assertOk();
        $response->assertJsonPath('data.logo_url', null);
    }

    public function test_nonexistent_media_id_is_rejected(): void
    {
        $this->actingAs($this->admin)->putJson('/admin/settings', [
            'logo_media_id' => 999999,
        ])->assertStatus(422);
    }

    public function test_soft_deleted_media_id_is_rejected(): void
    {
        $media = Media::factory()->create();
        $media->delete();

        $this->actingAs($this->admin)->putJson('/admin/settings', [
            'logo_media_id' => $media->id,
        ])->assertStatus(422);
    }

    public function test_admin_can_remove_the_logo(): void
    {
        $media = Media::factory()->create();
        $this->actingAs($this->admin)->putJson('/admin/settings', ['logo_media_id' => $media->id])->assertOk();

        $response = $this->actingAs($this->admin)->putJson('/admin/settings', ['logo_media_id' => null]);

        $response->assertOk();
        $response->assertJsonPath('data.logo_url', null);
    }

    public function test_admin_can_change_display_mode(): void
    {
        $response = $this->actingAs($this->admin)->putJson('/admin/settings', [
            'logo_display_mode' => 'logo_only',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.logo_display_mode', 'logo_only');
    }

    public function test_invalid_display_mode_is_rejected(): void
    {
        $this->actingAs($this->admin)->putJson('/admin/settings', [
            'logo_display_mode' => 'sideways',
        ])->assertStatus(422);
    }

    public function test_admin_can_change_brand_text(): void
    {
        $response = $this->actingAs($this->admin)->putJson('/admin/settings', [
            'brand_text' => 'Qalereya XYZ',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.brand_text', 'Qalereya XYZ');
    }

    public function test_clearing_brand_text_falls_back_to_the_default(): void
    {
        $this->actingAs($this->admin)->putJson('/admin/settings', ['brand_text' => 'Custom'])->assertOk();

        $response = $this->actingAs($this->admin)->putJson('/admin/settings', ['brand_text' => null]);

        $response->assertOk();
        $response->assertJsonPath('data.brand_text', 'ArtNiyyətli');
    }

    public function test_brand_text_over_max_length_is_rejected(): void
    {
        $this->actingAs($this->admin)->putJson('/admin/settings', [
            'brand_text' => str_repeat('a', 256),
        ])->assertStatus(422);
    }
}
