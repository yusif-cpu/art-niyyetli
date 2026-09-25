<?php

namespace Tests\Feature\Api;

use App\Models\Genre;
use App\Models\Medium;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class GenreMediumApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string, class-string<Genre|Medium>}>
     */
    public static function lookups(): array
    {
        return [
            'genres' => ['/api/v1/genres', Genre::class],
            'mediums' => ['/api/v1/mediums', Medium::class],
        ];
    }

    /**
     * @param  class-string<Genre|Medium>  $model
     * @param  array<string, string>  $names  locale => name
     */
    private function make(string $model, string $slug, array $names, array $attributes = []): Model
    {
        $item = $model::factory()->create(['slug' => $slug, ...$attributes]);

        foreach ($names as $locale => $name) {
            $item->translations()->create(['locale' => $locale, 'name' => $name]);
        }

        return $item;
    }

    #[DataProvider('lookups')]
    public function test_returns_only_active_values_ordered_by_sort_order_then_id(string $url, string $model): void
    {
        $this->make($model, 'second', ['az' => 'İkinci'], ['sort_order' => 1]);
        $this->make($model, 'hidden', ['az' => 'Gizli'], ['is_active' => false]);
        $this->make($model, 'first-a', ['az' => 'Birinci A'], ['sort_order' => 0]);
        $this->make($model, 'first-b', ['az' => 'Birinci B'], ['sort_order' => 0]);

        $response = $this->getJson($url);

        $response->assertOk();
        $this->assertSame(['first-a', 'first-b', 'second'], collect($response->json('data'))->pluck('slug')->all());
    }

    #[DataProvider('lookups')]
    public function test_item_shape_is_slug_name_and_sort_order(string $url, string $model): void
    {
        $this->make($model, 'abstract', ['az' => 'Abstrakt'], ['sort_order' => 3]);

        $this->getJson($url)->assertOk()->assertExactJson(['data' => [
            ['slug' => 'abstract', 'name' => 'Abstrakt', 'sort_order' => 3],
        ]]);
    }

    #[DataProvider('lookups')]
    public function test_uses_the_requested_locale_with_az_fallback(string $url, string $model): void
    {
        $this->make($model, 'has-en', ['az' => 'Azərbaycanca', 'en' => 'English']);
        $this->make($model, 'az-only', ['az' => 'Yalnız AZ']);

        $en = collect($this->getJson("{$url}?locale=en")->assertOk()->json('data'))->pluck('name', 'slug')->all();
        $az = collect($this->getJson($url)->assertOk()->json('data'))->pluck('name', 'slug')->all();

        $this->assertSame(['has-en' => 'English', 'az-only' => 'Yalnız AZ'], $en);
        $this->assertSame(['has-en' => 'Azərbaycanca', 'az-only' => 'Yalnız AZ'], $az);
    }

    #[DataProvider('lookups')]
    public function test_untranslated_value_has_null_name_and_empty_list_is_ok(string $url, string $model): void
    {
        $this->getJson($url)->assertOk()->assertExactJson(['data' => []]);

        $this->make($model, 'bare', []);

        $this->getJson($url)->assertOk()->assertJsonPath('data.0.name', null);
    }

    #[DataProvider('lookups')]
    public function test_response_carries_public_cache_headers_and_no_admin_fields(string $url, string $model): void
    {
        $this->make($model, 'abstract', ['az' => 'Abstrakt']);

        $response = $this->getJson($url);

        $response->assertOk()->assertHeader('ETag');
        $this->assertStringContainsString('public', (string) $response->headers->get('Cache-Control'));
        $this->assertArrayNotHasKey('is_active', $response->json('data.0'));
        $this->assertArrayNotHasKey('id', $response->json('data.0'));
    }

    public function test_filter_slugs_from_the_lists_work_on_the_artwork_endpoint(): void
    {
        $genre = $this->make(Genre::class, 'abstract', ['az' => 'Abstrakt']);

        $slug = $this->getJson('/api/v1/genres')->json('data.0.slug');

        $this->assertSame($genre->slug, $slug);
        $this->getJson("/api/v1/artworks?genre={$slug}")->assertOk();
    }
}
