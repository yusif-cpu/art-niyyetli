<?php

namespace Tests\Feature\Api;

use App\Models\NavigationItem;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NavigationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_the_four_seeded_header_routes_and_an_empty_footer_on_a_fresh_install(): void
    {
        $response = $this->getJson('/api/v1/navigation');

        $response->assertOk();
        $header = $response->json('data.header');
        $this->assertSame(['route', 'route', 'route', 'route'], array_column($header, 'type'));
        $this->assertSame(['artworks', 'artists', 'exhibitions', 'articles'], array_column($header, 'route_key'));
        $this->assertSame(['/artworks', '/artists', '/exhibitions', '/articles'], array_column($header, 'href'));
        $this->assertSame([], $response->json('data.footer'));
    }

    public function test_a_page_item_is_interleaved_with_routes_in_the_configured_order(): void
    {
        $page = Page::factory()->create(['type' => 'about', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'Haqqımızda', 'content' => 'C']);
        // Slot it between the 1st and 2nd seeded route (artworks=0, artists=1).
        NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null, 'sort_order' => 1]);
        NavigationItem::query()->where('route_key', 'artists')->update(['sort_order' => 2]);
        NavigationItem::query()->where('route_key', 'exhibitions')->update(['sort_order' => 3]);
        NavigationItem::query()->where('route_key', 'articles')->update(['sort_order' => 4]);

        $response = $this->getJson('/api/v1/navigation');

        $header = $response->json('data.header');
        $this->assertSame(['route', 'page', 'route', 'route', 'route'], array_column($header, 'type'));
        $this->assertSame('Haqqımızda', $header[1]['title']);
        $this->assertSame('/about', $header[1]['href']);
    }

    public function test_home_page_href_is_the_site_root(): void
    {
        $page = Page::factory()->create(['type' => 'home', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'C']);
        NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null, 'sort_order' => 10]);

        $response = $this->getJson('/api/v1/navigation');

        $item = collect($response->json('data.header'))->firstWhere('title', 'Ana səhifə');
        $this->assertSame('/', $item['href']);
    }

    public function test_hidden_items_are_excluded(): void
    {
        NavigationItem::query()->where('route_key', 'artworks')->update(['is_visible' => false]);

        $response = $this->getJson('/api/v1/navigation');

        $this->assertNotContains('artworks', array_column($response->json('data.header'), 'route_key'));
        $this->assertCount(3, $response->json('data.header'));
    }

    public function test_page_items_are_excluded_when_the_underlying_page_is_inactive(): void
    {
        $page = Page::factory()->create(['type' => 'about', 'is_active' => false]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'Haqqımızda', 'content' => 'C']);
        NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null, 'sort_order' => 10]);

        $response = $this->getJson('/api/v1/navigation');

        $this->assertCount(4, $response->json('data.header')); // only the 4 routes, the inactive page is excluded
    }

    public function test_page_items_are_excluded_when_the_underlying_page_is_soft_deleted(): void
    {
        $page = Page::factory()->create(['type' => 'custom', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'gone', 'title' => 'Gone', 'content' => 'C']);
        NavigationItem::create(['placement' => 'footer', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null, 'sort_order' => 0]);
        $page->delete();

        $response = $this->getJson('/api/v1/navigation');

        $this->assertSame([], $response->json('data.footer'));
    }

    public function test_en_locale_returns_the_localized_page_title(): void
    {
        $page = Page::factory()->create(['type' => 'about', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'Haqqımızda', 'content' => 'C']);
        $page->translations()->create(['locale' => 'en', 'slug' => 'about-en', 'title' => 'About', 'content' => 'C']);
        NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null, 'sort_order' => 10]);

        $response = $this->getJson('/api/v1/navigation?locale=en');

        $item = collect($response->json('data.header'))->firstWhere('href', '/about-en');
        $this->assertSame('About', $item['title']);
    }
}
