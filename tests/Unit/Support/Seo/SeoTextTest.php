<?php

namespace Tests\Unit\Support\Seo;

use App\Enums\Locale;
use App\Support\Seo\SeoText;
use Tests\TestCase;

class SeoTextTest extends TestCase
{
    public function test_page_title_appends_the_site_name(): void
    {
        $this->assertSame('Sunset Over Baku — ArtNiyyətli', SeoText::pageTitle('Sunset Over Baku'));
    }

    public function test_page_title_falls_back_to_the_bare_site_name_when_entity_title_is_null(): void
    {
        $this->assertSame('ArtNiyyətli', SeoText::pageTitle(null));
    }

    public function test_page_title_falls_back_to_the_bare_site_name_when_entity_title_is_empty(): void
    {
        $this->assertSame('ArtNiyyətli', SeoText::pageTitle(''));
    }

    public function test_description_trims_and_truncates_at_the_limit(): void
    {
        $long = str_repeat('Salam dünya. ', 30);

        $result = SeoText::description($long, 40);

        $this->assertNotNull($result);
        $this->assertLessThanOrEqual(43, mb_strlen($result)); // Str::limit adds an ellipsis
    }

    public function test_description_returns_null_for_null_input(): void
    {
        $this->assertNull(SeoText::description(null));
    }

    public function test_description_returns_null_for_empty_or_whitespace_only_input(): void
    {
        $this->assertNull(SeoText::description(''));
        $this->assertNull(SeoText::description('   '));
    }

    public function test_description_strips_any_tags_defensively(): void
    {
        $this->assertSame('bold text', SeoText::description('<b>bold text</b>'));
    }

    public function test_absolute_url_builds_from_the_configured_app_url(): void
    {
        config(['app.url' => 'http://localhost:8080']);

        $this->assertSame('http://localhost:8080/artworks/AN-1', SeoText::absoluteUrl('/artworks/AN-1'));
        $this->assertSame('http://localhost:8080/artworks/AN-1', SeoText::absoluteUrl('artworks/AN-1'));
    }

    public function test_absolute_url_handles_the_root_path(): void
    {
        config(['app.url' => 'http://localhost:8080']);

        $this->assertSame('http://localhost:8080/', SeoText::absoluteUrl('/'));
        $this->assertSame('http://localhost:8080/', SeoText::absoluteUrl(''));
    }

    public function test_absolute_url_strips_a_trailing_slash_on_the_configured_app_url(): void
    {
        config(['app.url' => 'http://localhost:8080/']);

        $this->assertSame('http://localhost:8080/artists', SeoText::absoluteUrl('/artists'));
    }

    public function test_og_locale_maps_to_the_standard_underscore_region_format(): void
    {
        $this->assertSame('az_AZ', SeoText::ogLocale(Locale::Az));
        $this->assertSame('en_US', SeoText::ogLocale(Locale::En));
    }
}
