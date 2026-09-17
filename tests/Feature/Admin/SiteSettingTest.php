<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteSettingTest extends TestCase
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

    public function test_all_six_allowlisted_keys_are_returned_null_when_unset(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/admin/settings');

        $response->assertOk()->assertJson(['data' => [
            'contact_email' => null,
            'phone' => null,
            'address' => null,
            'opening_hours' => null,
            'footer_text' => null,
            'whatsapp_number' => null,
        ]]);
    }

    public function test_updating_settings_persists_and_is_reflected_on_reread(): void
    {
        $this->actingAs($this->admin)->putJson('/admin/settings', [
            'contact_email' => 'info@artniyyetli.az',
            'phone' => '+994 50 000 00 00',
        ])->assertOk();

        $response = $this->actingAs($this->admin)->getJson('/admin/settings');

        $response->assertJsonPath('data.contact_email', 'info@artniyyetli.az');
        $response->assertJsonPath('data.phone', '+994 50 000 00 00');
    }

    public function test_whatsapp_number_round_trips_through_get_and_put(): void
    {
        $this->actingAs($this->admin)->putJson('/admin/settings', [
            'whatsapp_number' => '+994 55 123 45 67',
        ])->assertOk()->assertJsonPath('data.whatsapp_number', '+994 55 123 45 67');

        $response = $this->actingAs($this->admin)->getJson('/admin/settings');

        $response->assertJsonPath('data.whatsapp_number', '+994 55 123 45 67');
    }

    public function test_arbitrary_key_in_the_request_body_never_creates_a_setting_row(): void
    {
        $this->actingAs($this->admin)->putJson('/admin/settings', [
            'contact_email' => 'info@artniyyetli.az',
            'internal_flag' => 'true',
            'key' => 'anything',
            'value' => 'anything',
        ])->assertOk();

        $this->assertDatabaseMissing('site_settings', ['key' => 'internal_flag']);
        $this->assertDatabaseMissing('site_settings', ['key' => 'key']);
        $this->assertDatabaseMissing('site_settings', ['key' => 'anything']);
    }

    public function test_invalid_email_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->putJson('/admin/settings', ['contact_email' => 'not-an-email'])
            ->assertStatus(422);
    }

    public function test_unauthenticated_request_is_denied(): void
    {
        $this->getJson('/admin/settings')->assertStatus(401);
        $this->putJson('/admin/settings', ['phone' => '123'])->assertStatus(401);
    }

    public function test_editor_can_read_and_update_settings(): void
    {
        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $this->actingAs($editor)->getJson('/admin/settings')->assertOk();
        $this->actingAs($editor)->putJson('/admin/settings', ['footer_text' => 'Footer'])->assertOk();
    }

    public function test_existing_unrelated_setting_rows_are_never_exposed(): void
    {
        SiteSetting::factory()->create(['key' => 'internal_secret', 'value' => 'shh', 'type' => 'string']);

        $response = $this->actingAs($this->admin)->getJson('/admin/settings');

        $response->assertJsonMissingPath('data.internal_secret');
        $this->assertStringNotContainsString('shh', $response->getContent());
    }
}
