<?php

namespace Tests\Feature\Api;

use App\Enums\LogoDisplayMode;
use App\Models\Media;
use App\Models\MediaVariant;
use App\Models\SocialLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SocialLinkApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_active_links_ordered_by_sort_order(): void
    {
        SocialLink::factory()->create(['platform' => 'facebook', 'sort_order' => 2, 'is_active' => true]);
        SocialLink::factory()->create(['platform' => 'instagram', 'sort_order' => 1, 'is_active' => true]);
        SocialLink::factory()->create(['platform' => 'hidden', 'sort_order' => 0, 'is_active' => false]);

        $response = $this->getJson('/api/v1/social-links');

        $response->assertOk();
        $platforms = collect($response->json('data'))->pluck('platform')->all();
        $this->assertSame(['instagram', 'facebook'], $platforms);
    }

    public function test_response_does_not_expose_internal_fields(): void
    {
        SocialLink::factory()->create(['platform' => 'instagram', 'is_active' => true]);

        $response = $this->getJson('/api/v1/social-links');

        $response->assertOk();
        $item = $response->json('data.0');
        $this->assertSame(['platform', 'url', 'display_mode', 'logo_url', 'sort_order'], array_keys($item));
    }

    public function test_returns_logo_url_and_display_mode_for_each_link(): void
    {
        $media = Media::factory()->create();
        MediaVariant::create([
            'media_id' => $media->id, 'variant' => 'thumbnail-webp', 'disk' => 'public',
            'path' => 'variants/instagram-thumb.webp', 'mime_type' => 'image/webp',
            'size_bytes' => 100, 'width' => 96, 'height' => 96,
        ]);
        SocialLink::factory()->create([
            'platform' => 'Instagram', 'sort_order' => 0,
            'logo_media_id' => $media->id, 'display_mode' => LogoDisplayMode::LogoOnly,
        ]);
        SocialLink::factory()->create(['platform' => 'Facebook', 'sort_order' => 1, 'display_mode' => LogoDisplayMode::TextOnly]);

        $data = $this->getJson('/api/v1/social-links')->assertOk()->json('data');

        $this->assertSame('logo_only', $data[0]['display_mode']);
        $this->assertStringContainsString('instagram-thumb.webp', $data[0]['logo_url']);
        $this->assertSame('text_only', $data[1]['display_mode']);
        $this->assertNull($data[1]['logo_url']);
    }

    public function test_logo_url_is_null_when_the_logo_media_was_soft_deleted(): void
    {
        $media = Media::factory()->create();
        SocialLink::factory()->create(['logo_media_id' => $media->id]);
        $media->delete();

        $this->assertNull($this->getJson('/api/v1/social-links')->assertOk()->json('data.0.logo_url'));
    }

    public function test_listing_does_not_query_media_per_link(): void
    {
        SocialLink::factory()->count(5)->create(['logo_media_id' => Media::factory()->create()->id]);

        DB::enableQueryLog();
        $this->getJson('/api/v1/social-links')->assertOk();
        $mediaQueries = collect(DB::getQueryLog())->filter(fn ($q) => str_contains($q['query'], 'from "media"'));

        $this->assertCount(1, $mediaQueries);
    }

    public function test_post_is_rejected(): void
    {
        $this->postJson('/api/v1/social-links', [])->assertStatus(405);
    }

    public function test_admin_social_links_still_requires_auth(): void
    {
        $this->getJson('/admin/social-links')->assertStatus(401);
    }
}
