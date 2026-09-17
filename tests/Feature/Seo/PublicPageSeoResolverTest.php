<?php

namespace Tests\Feature\Seo;

use App\Enums\Locale;
use App\Enums\PageType;
use App\Models\Page;
use App\Services\Seo\PublicPageSeoResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicPageSeoResolverTest extends TestCase
{
    use RefreshDatabase;

    private function resolver(): PublicPageSeoResolver
    {
        return app(PublicPageSeoResolver::class);
    }

    public function test_home_uses_the_active_home_pages_hero_section(): void
    {
        $home = Page::create(['type' => PageType::Home, 'is_active' => true]);
        $home->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'X']);
        $home->sections()->create(['key' => 'hero', 'sort_order' => 0, 'is_active' => true])
            ->translations()->create(['locale' => 'az', 'heading' => 'ArtNiyyətli', 'body' => 'Müasir Azərbaycan sənətini kəşf edin.']);

        $seo = $this->resolver()->resolve([], Locale::Az);

        $this->assertSame('ArtNiyyətli', $seo->title);
        $this->assertSame('Müasir Azərbaycan sənətini kəşf edin.', $seo->description);
        $this->assertSame('http://localhost:8080/', $seo->canonicalUrl);
        $this->assertTrue($seo->index);
        $this->assertTrue($seo->follow);
        $this->assertSame(200, $seo->httpStatus);
        $this->assertNotNull($seo->jsonLd);
        $this->assertSame('https://schema.org', $seo->jsonLd['@context']);
    }

    public function test_home_falls_back_to_the_bare_site_name_when_no_active_home_page_exists(): void
    {
        $seo = $this->resolver()->resolve([], Locale::Az);

        $this->assertSame('ArtNiyyətli', $seo->title);
        $this->assertNull($seo->description);
        $this->assertTrue($seo->index);
    }

    public function test_static_page_resolves_an_active_page_by_slug(): void
    {
        $page = Page::create(['type' => PageType::About, 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'Haqqımızda', 'content' => 'Qalereya haqqında məlumat.']);

        $seo = $this->resolver()->resolve(['about'], Locale::Az);

        $this->assertSame('Haqqımızda — ArtNiyyətli', $seo->title);
        $this->assertSame('Qalereya haqqında məlumat.', $seo->description);
        $this->assertSame('http://localhost:8080/about', $seo->canonicalUrl);
        $this->assertTrue($seo->index);
        $this->assertSame(200, $seo->httpStatus);
        $this->assertNull($seo->jsonLd);
    }

    public function test_static_page_is_not_found_for_an_unresolvable_slug(): void
    {
        $seo = $this->resolver()->resolve(['nonexistent'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertFalse($seo->index);
        $this->assertTrue($seo->follow);
    }

    public function test_static_page_is_not_found_for_an_inactive_page(): void
    {
        $page = Page::create(['type' => PageType::Custom, 'is_active' => false]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'hidden', 'title' => 'Hidden', 'content' => 'X']);

        $seo = $this->resolver()->resolve(['hidden'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertFalse($seo->index);
    }

    public function test_multi_segment_unmatched_path_is_not_found(): void
    {
        $seo = $this->resolver()->resolve(['a', 'b', 'c'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertFalse($seo->index);
        $this->assertTrue($seo->follow);
    }

    public function test_not_found_reports_the_requested_locale_in_og_locale(): void
    {
        $seo = $this->resolver()->resolve(['nonexistent'], Locale::En);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertSame('en_US', $seo->ogLocale);
    }
}
