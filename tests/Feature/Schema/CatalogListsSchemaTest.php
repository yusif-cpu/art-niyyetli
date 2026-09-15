<?php

namespace Tests\Feature\Schema;

use App\Models\Genre;
use App\Models\GenreTranslation;
use App\Models\Medium;
use App\Models\MediumTranslation;
use App\Models\PriceRange;
use App\Models\PriceRangeTranslation;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogListsSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_medium_translation_uniqueness_is_enforced(): void
    {
        $medium = Medium::create(['slug' => 'oil-on-canvas']);
        MediumTranslation::create(['medium_id' => $medium->id, 'locale' => 'az', 'name' => 'Kətan üzərində yağlı boya']);

        $this->expectException(QueryException::class);
        MediumTranslation::create(['medium_id' => $medium->id, 'locale' => 'az', 'name' => 'duplicate']);
    }

    public function test_genre_translation_uniqueness_is_enforced(): void
    {
        $genre = Genre::create(['slug' => 'abstraction']);
        GenreTranslation::create(['genre_id' => $genre->id, 'locale' => 'az', 'name' => 'Abstraksiya']);

        $this->expectException(QueryException::class);
        GenreTranslation::create(['genre_id' => $genre->id, 'locale' => 'az', 'name' => 'duplicate']);
    }

    public function test_price_range_supports_open_ended_upper_bound_and_translations(): void
    {
        $range = PriceRange::create(['min_price' => 10000, 'max_price' => null]);
        PriceRangeTranslation::create(['price_range_id' => $range->id, 'locale' => 'az', 'name' => '10,000 AZN-dən yuxarı']);

        $this->assertNull($range->max_price);
        $this->assertCount(1, $range->translations);
    }
}
