<?php

namespace Tests\Feature\Api;

use App\Models\SocialLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $this->assertSame(['platform', 'url', 'sort_order'], array_keys($item));
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
