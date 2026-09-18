<?php

namespace Tests\Feature\Api;

use App\Models\Media;
use App\Models\MediaVariant;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_active_pages_without_sections(): void
    {
        $page = Page::factory()->create(['type' => 'home', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'Content']);

        $hidden = Page::factory()->create(['type' => 'about', 'is_active' => false]);
        $hidden->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'Haqqımızda', 'content' => 'Content']);

        $response = $this->getJson('/api/v1/pages');

        $response->assertOk();
        $items = $response->json('data');
        $this->assertCount(1, $items);
        $this->assertSame('home', $items[0]['slug']);
        $this->assertArrayNotHasKey('sections', $items[0]);
    }

    public function test_show_returns_active_sections_ordered(): void
    {
        $page = Page::factory()->create(['type' => 'home', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'Content']);

        $hero = $page->sections()->create(['key' => 'hero', 'sort_order' => 0, 'is_active' => true]);
        $hero->translations()->create(['locale' => 'az', 'heading' => 'Xoş gəldiniz', 'body' => 'Slogan']);

        $hiddenSection = $page->sections()->create(['key' => 'hidden', 'sort_order' => 1, 'is_active' => false]);
        $hiddenSection->translations()->create(['locale' => 'az', 'heading' => 'Hidden', 'body' => 'Hidden']);

        $response = $this->getJson('/api/v1/pages/home');

        $response->assertOk();
        $sections = $response->json('data.sections');
        $this->assertCount(1, $sections);
        $this->assertSame('hero', $sections[0]['key']);
        $this->assertSame('Xoş gəldiniz', $sections[0]['heading']);
    }

    public function test_show_returns_404_for_unknown_slug(): void
    {
        $this->getJson('/api/v1/pages/does-not-exist')->assertStatus(404);
    }

    public function test_show_returns_404_when_page_inactive(): void
    {
        $page = Page::factory()->create(['type' => 'contact', 'is_active' => false]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'contact', 'title' => 'Əlaqə', 'content' => 'Content']);

        $this->getJson('/api/v1/pages/contact')->assertStatus(404);
    }

    public function test_en_locale_falls_back_per_field(): void
    {
        $page = Page::factory()->create(['type' => 'home', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'AZ content']);
        $page->translations()->create(['locale' => 'en', 'slug' => 'home-en', 'title' => '', 'content' => 'EN content']);

        $response = $this->getJson('/api/v1/pages/home?locale=en');

        $response->assertOk();
        $this->assertSame('Ana səhifə', $response->json('data.title'));
        $this->assertSame('EN content', $response->json('data.content'));
    }

    public function test_index_orders_pages_by_id_and_does_not_expose_navigation_fields(): void
    {
        $createdFirst = Page::factory()->create(['type' => 'about', 'is_active' => true]);
        $createdFirst->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'Haqqımızda', 'content' => 'C']);

        $createdSecond = Page::factory()->create(['type' => 'home', 'is_active' => true]);
        $createdSecond->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'C']);

        $response = $this->getJson('/api/v1/pages');

        $response->assertOk();
        $items = $response->json('data');
        $this->assertSame(['about', 'home'], array_column($items, 'slug'));
        $this->assertArrayNotHasKey('nav_placement', $items[0]);
        $this->assertArrayNotHasKey('sort_order', $items[0]);
    }

    public function test_section_image_url_resolves_when_media_attached(): void
    {
        $media = Media::factory()->create();
        MediaVariant::create([
            'media_id' => $media->id,
            'variant' => 'detail-webp',
            'disk' => 'public',
            'path' => 'variants/detail.webp',
            'mime_type' => 'image/webp',
            'size_bytes' => 100,
            'width' => 100,
            'height' => 100,
        ]);

        $page = Page::factory()->create(['type' => 'home', 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'Content']);

        $hero = $page->sections()->create(['key' => 'hero', 'sort_order' => 0, 'is_active' => true, 'media_id' => $media->id]);
        $hero->translations()->create(['locale' => 'az', 'heading' => 'Xoş gəldiniz', 'body' => 'Slogan']);

        $response = $this->getJson('/api/v1/pages/home');

        $response->assertOk();
        $this->assertStringContainsString('variants/detail.webp', $response->json('data.sections.0.image_url'));
    }
}
