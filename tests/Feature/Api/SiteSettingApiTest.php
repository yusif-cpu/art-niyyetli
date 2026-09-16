<?php

namespace Tests\Feature\Api;

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
}
