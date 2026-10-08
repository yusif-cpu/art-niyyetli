<?php

namespace Tests\Unit\Support\Seo;

use App\Enums\Locale;
use App\Support\Seo\SeoText;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SeoTextTest extends TestCase
{
    public function test_page_title_appends_the_site_name(): void
    {
        $this->assertSame('Sunset Over Baku | ArtNiyyətli', SeoText::pageTitle('Sunset Over Baku'));
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

    /** @return array<string, array{0: string, 1: string}> */
    public static function azNumbers(): array
    {
        return [
            'local with trunk 0 and spaces' => ['070 353 05 12', '+994703530512'],
            'already international' => ['+994703530512', '+994703530512'],
            'international with spaces and dashes' => ['+994 70 353-05-12', '+994703530512'],
            '00 prefix' => ['00994703530512', '+994703530512'],
            'bare 994 prefix' => ['994703530512', '+994703530512'],
            'parentheses' => ['(070) 353 05 12', '+994703530512'],
            'non-breaking spaces' => ["070\u{00A0}353\u{00A0}05\u{00A0}12", '+994703530512'],
        ];
    }

    #[DataProvider('azNumbers')]
    public function test_international_phone_converts_an_azerbaijani_number_to_e164(string $written, string $expected): void
    {
        $this->assertSame($expected, SeoText::internationalPhone($written));
    }

    public function test_international_phone_leaves_a_number_that_is_not_a_whole_azerbaijani_one_as_written(): void
    {
        // A digit too few: a +994 in front would make a number that dials nothing.
        $this->assertSame('070353051', SeoText::internationalPhone('070 353 05 1'));
        $this->assertSame('+441234567890', SeoText::internationalPhone('+44 1234 567 890'));
    }

    public function test_international_phone_is_null_for_an_empty_value(): void
    {
        $this->assertNull(SeoText::internationalPhone(null));
        $this->assertNull(SeoText::internationalPhone('  '));
    }

    public function test_og_locale_maps_to_the_standard_underscore_region_format(): void
    {
        $this->assertSame('az_AZ', SeoText::ogLocale(Locale::Az));
        $this->assertSame('en_US', SeoText::ogLocale(Locale::En));
    }
}
