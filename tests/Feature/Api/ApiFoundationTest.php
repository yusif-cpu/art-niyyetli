<?php

namespace Tests\Feature\Api;

use App\Enums\Locale;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use App\Support\Api\PaginationParams;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Tests\TestCase;

class ApiFoundationTest extends TestCase
{
    public function test_locale_resolver_defaults_to_az_when_missing(): void
    {
        $this->assertSame(Locale::Az, LocaleResolver::resolve(Request::create('/api/v1/faqs')));
    }

    public function test_locale_resolver_accepts_en(): void
    {
        $this->assertSame(Locale::En, LocaleResolver::resolve(Request::create('/api/v1/faqs?locale=en')));
    }

    public function test_locale_resolver_falls_back_to_az_for_invalid_locale(): void
    {
        $this->assertSame(Locale::Az, LocaleResolver::resolve(Request::create('/api/v1/faqs?locale=fr')));
    }

    private function translationRow(Locale $locale, array $fields): object
    {
        return (object) array_merge(['locale' => $locale], $fields);
    }

    public function test_localized_fields_uses_en_when_present(): void
    {
        $translations = new Collection([
            $this->translationRow(Locale::Az, ['title' => 'AZ Title']),
            $this->translationRow(Locale::En, ['title' => 'EN Title']),
        ]);

        $result = LocalizedFields::resolve($translations, Locale::En, ['title']);

        $this->assertSame('EN Title', $result['title']);
    }

    public function test_localized_fields_falls_back_to_az_when_en_field_empty(): void
    {
        $translations = new Collection([
            $this->translationRow(Locale::Az, ['title' => 'AZ Title']),
            $this->translationRow(Locale::En, ['title' => '']),
        ]);

        $result = LocalizedFields::resolve($translations, Locale::En, ['title']);

        $this->assertSame('AZ Title', $result['title']);
    }

    public function test_localized_fields_returns_null_when_both_empty(): void
    {
        $translations = new Collection([
            $this->translationRow(Locale::Az, ['title' => null]),
        ]);

        $result = LocalizedFields::resolve($translations, Locale::En, ['title']);

        $this->assertNull($result['title']);
    }

    public function test_localized_fields_never_reads_en_when_locale_is_az(): void
    {
        $translations = new Collection([
            $this->translationRow(Locale::Az, ['title' => 'AZ Title']),
            $this->translationRow(Locale::En, ['title' => 'EN Title']),
        ]);

        $result = LocalizedFields::resolve($translations, Locale::Az, ['title']);

        $this->assertSame('AZ Title', $result['title']);
    }

    public function test_pagination_defaults_to_24(): void
    {
        $this->assertSame(24, PaginationParams::perPage(Request::create('/api/v1/artworks')));
    }

    public function test_pagination_accepts_valid_value(): void
    {
        $this->assertSame(10, PaginationParams::perPage(Request::create('/api/v1/artworks?per_page=10')));
    }

    public function test_pagination_normalizes_zero(): void
    {
        $this->assertSame(24, PaginationParams::perPage(Request::create('/api/v1/artworks?per_page=0')));
    }

    public function test_pagination_normalizes_absurd_value(): void
    {
        $this->assertSame(24, PaginationParams::perPage(Request::create('/api/v1/artworks?per_page=9999')));
    }

    public function test_pagination_normalizes_non_numeric_value(): void
    {
        $this->assertSame(24, PaginationParams::perPage(Request::create('/api/v1/artworks?per_page=abc')));
    }

    public function test_unknown_api_route_returns_json_404(): void
    {
        $response = $this->getJson('/api/v1/does-not-exist');

        $response->assertStatus(404);
        $response->assertHeader('Content-Type', 'application/json');
    }
}
