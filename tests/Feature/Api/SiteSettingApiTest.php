<?php

namespace Tests\Feature\Api;

use App\Models\Media;
use App\Models\MediaVariant;
use App\Models\SiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteSettingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_allowlisted_keys_with_null_defaults(): void
    {
        $response = $this->getJson('/api/v1/site-settings');

        $response->assertOk();
        $response->assertJson(['data' => [
            'contact_email' => null,
            'phone' => null,
            'address' => null,
            'opening_hours' => null,
            'footer_text' => null,
        ]]);
    }

    public function test_returns_set_values(): void
    {
        SiteSetting::factory()->create(['key' => 'contact_email', 'value' => 'hello@artniyyetli.az', 'type' => 'string']);

        $response = $this->getJson('/api/v1/site-settings');

        $response->assertOk();
        $response->assertJsonPath('data.contact_email', 'hello@artniyyetli.az');
    }

    public function test_non_allowlisted_key_never_leaks(): void
    {
        SiteSetting::factory()->create(['key' => 'internal_flag', 'value' => 'secret', 'type' => 'string']);

        $response = $this->getJson('/api/v1/site-settings');

        $response->assertOk();
        $this->assertArrayNotHasKey('internal_flag', $response->json('data'));
    }

    public function test_post_is_rejected(): void
    {
        $this->postJson('/api/v1/site-settings', [])->assertStatus(405);
    }

    public function test_brand_defaults_are_exposed_when_unset(): void
    {
        $response = $this->getJson('/api/v1/site-settings');

        $response->assertOk();
        $response->assertJsonPath('data.brand_text', 'ArtNiyyətli');
        $response->assertJsonPath('data.logo_display_mode', 'logo_text');
        $response->assertJsonPath('data.logo_url', null);
    }

    public function test_custom_brand_text_and_display_mode_are_exposed(): void
    {
        SiteSetting::factory()->create(['key' => 'brand_text', 'value' => 'Qalereya XYZ', 'type' => 'string']);
        SiteSetting::factory()->create(['key' => 'logo_display_mode', 'value' => 'logo_only', 'type' => 'string']);

        $response = $this->getJson('/api/v1/site-settings');

        $response->assertOk();
        $response->assertJsonPath('data.brand_text', 'Qalereya XYZ');
        $response->assertJsonPath('data.logo_display_mode', 'logo_only');
    }

    public function test_logo_url_is_exposed_once_a_logo_is_set(): void
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
        SiteSetting::factory()->create(['key' => 'logo_media_id', 'value' => (string) $media->id, 'type' => 'string']);

        $response = $this->getJson('/api/v1/site-settings');

        $response->assertOk();
        $this->assertStringContainsString('logo-thumb.webp', $response->json('data.logo_url'));
    }
}
