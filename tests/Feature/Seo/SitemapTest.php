<?php

namespace Tests\Feature\Seo;

use App\Enums\PageType;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SitemapTest extends TestCase
{
    use RefreshDatabase;

    public function test_sitemap_always_includes_the_homepage(): void
    {
        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertHeader('content-type', 'application/xml; charset=UTF-8');
        $response->assertSee('<loc>http://localhost:8080/</loc>', false);
    }

    public function test_sitemap_includes_an_active_static_page(): void
    {
        $page = Page::create(['type' => PageType::About, 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'x', 'content' => 'x']);

        $response = $this->get('/sitemap.xml');

        $response->assertSee('<loc>http://localhost:8080/about</loc>', false);
    }

    public function test_sitemap_excludes_the_home_type_page_as_a_slug_entry(): void
    {
        $home = Page::create(['type' => PageType::Home, 'is_active' => true]);
        $home->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'x', 'content' => 'x']);

        $response = $this->get('/sitemap.xml');

        $response->assertDontSee('<loc>http://localhost:8080/home</loc>', false);
    }

    public function test_sitemap_excludes_an_inactive_page(): void
    {
        $page = Page::create(['type' => PageType::Contact, 'is_active' => false]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'contact', 'title' => 'x', 'content' => 'x']);

        $response = $this->get('/sitemap.xml');

        $response->assertDontSee('<loc>http://localhost:8080/contact</loc>', false);
    }

    public function test_sitemap_includes_an_active_artwork_and_excludes_an_inactive_one(): void
    {
        $active = Artwork::create([
            'artist_id' => Artist::create([])->id, 'medium_id' => Medium::firstOrCreate(['slug' => 'oil'])->id,
            'genre_id' => Genre::firstOrCreate(['slug' => 'painting'])->id, 'year_created' => 2023,
            'width_cm' => 10, 'height_cm' => 10, 'price' => 100, 'inventory_code' => 'AN-SITEMAP-1', 'is_active' => true,
        ]);
        $inactive = Artwork::create([
            'artist_id' => Artist::create([])->id, 'medium_id' => Medium::firstOrCreate(['slug' => 'oil'])->id,
            'genre_id' => Genre::firstOrCreate(['slug' => 'painting'])->id, 'year_created' => 2023,
            'width_cm' => 10, 'height_cm' => 10, 'price' => 100, 'inventory_code' => 'AN-SITEMAP-2', 'is_active' => false,
        ]);

        $response = $this->get('/sitemap.xml');

        $response->assertSee('<loc>http://localhost:8080/artworks/AN-SITEMAP-1</loc>', false);
        $response->assertDontSee('<loc>http://localhost:8080/artworks/AN-SITEMAP-2</loc>', false);
    }

    public function test_sitemap_never_includes_admin_api_or_enquiry_urls(): void
    {
        $response = $this->get('/sitemap.xml');

        $response->assertDontSee('/admin', false);
        $response->assertDontSee('/api', false);
        $response->assertDontSee('enquir', false);
    }
}
