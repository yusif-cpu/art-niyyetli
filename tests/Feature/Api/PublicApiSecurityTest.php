<?php

namespace Tests\Feature\Api;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\SocialLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_get_endpoints_reject_post(): void
    {
        $endpoints = [
            '/api/v1/homepage', '/api/v1/pages', '/api/v1/artists', '/api/v1/artworks',
            '/api/v1/exhibitions', '/api/v1/articles', '/api/v1/faqs', '/api/v1/site-settings',
            '/api/v1/social-links',
        ];

        foreach ($endpoints as $endpoint) {
            $this->postJson($endpoint, [])->assertStatus(405);
        }
    }

    public function test_unknown_route_is_404_json_with_no_internal_detail_in_production(): void
    {
        // Debug-trace suppression is Laravel's own APP_DEBUG=false behavior,
        // not something this phase adds — asserted here under a real
        // production-like config to prove that guarantee actually holds for
        // the public API surface.
        config(['app.debug' => false]);

        $response = $this->getJson('/api/v1/does-not-exist');

        $response->assertStatus(404);
        $body = $response->getContent();
        $this->assertStringNotContainsString('Stack trace', $body);
        $this->assertStringNotContainsString('.php', $body);
        $this->assertStringNotContainsString('exception', $body);
    }

    public function test_admin_routes_remain_protected(): void
    {
        $this->getJson('/admin/dashboard')->assertStatus(401);
        $this->getJson('/admin/artworks')->assertStatus(401);
    }

    public function test_rate_limit_returns_429_after_threshold(): void
    {
        $last = null;

        // One request past the configured threshold (60/min by default).
        for ($i = 0; $i < config('security.rate_limits.public_api') + 1; $i++) {
            $last = $this->getJson('/api/v1/social-links');
        }

        $last->assertStatus(429);
    }

    public function test_artist_response_contract_keys(): void
    {
        $artist = Artist::factory()->create(['is_active' => true]);
        $artist->translations()->create(['locale' => 'az', 'slug' => 'artist-'.$artist->id, 'first_name' => 'A', 'last_name' => 'B']);

        $response = $this->getJson('/api/v1/artists');
        $response->assertOk();

        $expected = ['id', 'slug', 'first_name', 'last_name', 'birth_year', 'birth_place', 'direction', 'biography', 'artistic_approach', 'portrait_url'];
        $this->assertSame($expected, array_keys($response->json('data.0')));
    }

    public function test_artwork_card_response_contract_keys_and_excludes_detail_only_fields(): void
    {
        $artist = Artist::factory()->create();
        $genre = Genre::factory()->create();
        $medium = Medium::factory()->create();
        $artwork = Artwork::factory()->create([
            'artist_id' => $artist->id, 'genre_id' => $genre->id, 'medium_id' => $medium->id,
            'is_active' => true, 'frame_condition' => 'Only in detail',
        ]);
        $artwork->translations()->create(['locale' => 'az', 'slug' => 'aw-'.$artwork->id, 'title' => 'T', 'short_description' => 'S', 'provenance' => 'P']);

        $response = $this->getJson('/api/v1/artworks');
        $response->assertOk();

        $expected = ['inventory_code', 'title', 'artist', 'image_url', 'genre', 'medium', 'price', 'currency', 'availability', 'width_cm', 'height_cm'];
        $this->assertSame($expected, array_keys($response->json('data.0')));
        $this->assertArrayNotHasKey('frame_condition', $response->json('data.0'));
        $body = $response->getContent();
        $this->assertStringNotContainsString('Only in detail', $body);
    }

    public function test_social_link_response_contract_keys(): void
    {
        SocialLink::factory()->create(['is_active' => true]);

        $response = $this->getJson('/api/v1/social-links');
        $response->assertOk();

        $this->assertSame(['platform', 'url', 'display_mode', 'logo_url', 'sort_order'], array_keys($response->json('data.0')));
    }
}
