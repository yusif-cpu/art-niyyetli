<?php

namespace Tests\Feature\Admin;

use App\Enums\LogoDisplayMode;
use App\Models\Media;
use App\Models\MediaVariant;
use App\Models\Role;
use App\Models\SocialLink;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocialLinkTest extends TestCase
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

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'platform' => 'instagram',
            'url' => 'https://instagram.com/artniyyetli',
            'is_active' => true,
        ], $overrides);
    }

    public function test_administrator_can_create_list_update_and_delete_a_social_link(): void
    {
        $created = $this->actingAs($this->admin)->postJson('/admin/social-links', $this->payload());
        $created->assertOk();
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->getJson('/admin/social-links')->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->admin)->putJson("/admin/social-links/{$id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($this->admin)->deleteJson("/admin/social-links/{$id}")->assertOk();
        $this->assertDatabaseMissing('social_links', ['id' => $id]);
    }

    public function test_reordering_social_links_updates_sort_order(): void
    {
        $first = SocialLink::factory()->create(['sort_order' => 0]);
        $second = SocialLink::factory()->create(['sort_order' => 1]);

        $this->actingAs($this->admin)->postJson('/admin/social-links/reorder', [
            'items' => [
                ['id' => $first->id, 'sort_order' => 1],
                ['id' => $second->id, 'sort_order' => 0],
            ],
        ])->assertOk();

        $this->assertSame(1, $first->fresh()->sort_order);
        $this->assertSame(0, $second->fresh()->sort_order);
    }

    public function test_javascript_scheme_url_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['url' => 'javascript:alert(1)']))
            ->assertStatus(422);
    }

    public function test_data_scheme_url_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['url' => 'data:text/html,<script>alert(1)</script>']))
            ->assertStatus(422);
    }

    public function test_valid_https_url_is_accepted(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['url' => 'https://wa.me/994500000000']))
            ->assertOk();
    }

    private function mediaWithThumbnail(string $path = 'variants/instagram-thumb.webp'): Media
    {
        $media = Media::factory()->create();
        MediaVariant::create([
            'media_id' => $media->id,
            'variant' => 'thumbnail-webp',
            'disk' => 'public',
            'path' => $path,
            'mime_type' => 'image/webp',
            'size_bytes' => 100,
            'width' => 96,
            'height' => 96,
        ]);

        return $media;
    }

    public function test_link_is_created_with_a_logo_and_display_mode_and_returns_the_logo_url(): void
    {
        $media = $this->mediaWithThumbnail();

        $response = $this->actingAs($this->admin)->postJson('/admin/social-links', $this->payload([
            'logo_media_id' => $media->id,
            'display_mode' => 'logo_only',
        ]));

        $response->assertOk()
            ->assertJsonPath('data.logo_media_id', $media->id)
            ->assertJsonPath('data.display_mode', 'logo_only');
        $this->assertStringContainsString('instagram-thumb.webp', $response->json('data.logo_url'));
        $this->assertDatabaseHas('social_links', ['id' => $response->json('data.id'), 'logo_media_id' => $media->id, 'display_mode' => 'logo_only']);
    }

    public function test_display_mode_defaults_to_logo_and_text_without_a_logo(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/social-links', $this->payload())
            ->assertOk()
            ->assertJsonPath('data.display_mode', 'logo_text')
            ->assertJsonPath('data.logo_media_id', null)
            ->assertJsonPath('data.logo_url', null);
    }

    public function test_list_exposes_logo_url_and_display_mode(): void
    {
        $media = $this->mediaWithThumbnail();
        SocialLink::factory()->create(['logo_media_id' => $media->id, 'display_mode' => LogoDisplayMode::LogoOnly]);

        $item = $this->actingAs($this->admin)->getJson('/admin/social-links')->assertOk()->json('data.0');

        $this->assertSame('logo_only', $item['display_mode']);
        $this->assertStringContainsString('instagram-thumb.webp', $item['logo_url']);
    }

    public function test_logo_and_display_mode_can_be_changed_and_the_logo_removed(): void
    {
        $media = $this->mediaWithThumbnail();
        $link = SocialLink::factory()->create();

        $this->actingAs($this->admin)->putJson("/admin/social-links/{$link->id}", [
            'logo_media_id' => $media->id,
            'display_mode' => 'logo_only',
        ])->assertOk()->assertJsonPath('data.display_mode', 'logo_only');

        $this->actingAs($this->admin)->putJson("/admin/social-links/{$link->id}", [
            'logo_media_id' => null,
            'display_mode' => 'text_only',
        ])->assertOk()->assertJsonPath('data.logo_media_id', null)->assertJsonPath('data.logo_url', null);
    }

    public function test_invalid_display_mode_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['display_mode' => 'banner']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('display_mode');

        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['display_mode' => null]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('display_mode');
    }

    public function test_logo_must_reference_an_existing_image_media(): void
    {
        $missing = $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['logo_media_id' => 99999]));
        $missing->assertStatus(422)->assertJsonValidationErrors('logo_media_id');

        $deleted = Media::factory()->create();
        $deleted->delete();
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['logo_media_id' => $deleted->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('logo_media_id');

        $video = Media::factory()->create(['type' => 'video']);
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['logo_media_id' => $video->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('logo_media_id');
    }

    public function test_logo_only_mode_requires_a_logo_on_create(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/admin/social-links', $this->payload(['display_mode' => 'logo_only']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('logo_media_id');
    }

    public function test_logo_only_mode_requires_a_logo_on_update_judged_against_the_saved_link(): void
    {
        $withoutLogo = SocialLink::factory()->create();
        $this->actingAs($this->admin)
            ->putJson("/admin/social-links/{$withoutLogo->id}", ['display_mode' => 'logo_only'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('logo_media_id');

        $media = $this->mediaWithThumbnail();
        $logoOnly = SocialLink::factory()->create(['logo_media_id' => $media->id, 'display_mode' => LogoDisplayMode::LogoOnly]);

        $this->actingAs($this->admin)
            ->putJson("/admin/social-links/{$logoOnly->id}", ['logo_media_id' => null])
            ->assertStatus(422)
            ->assertJsonValidationErrors('logo_media_id');

        // An unrelated partial update keeps working when the saved link is already consistent.
        $this->actingAs($this->admin)
            ->putJson("/admin/social-links/{$logoOnly->id}", ['is_active' => false])
            ->assertOk();
    }

    public function test_unauthenticated_request_is_denied(): void
    {
        $this->getJson('/admin/social-links')->assertStatus(401);
        $this->postJson('/admin/social-links', $this->payload())->assertStatus(401);
    }

    public function test_editor_can_manage_social_links(): void
    {
        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $this->actingAs($editor)->postJson('/admin/social-links', $this->payload())->assertOk();
    }
}
