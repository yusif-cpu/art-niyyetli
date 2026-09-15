<?php

namespace Tests\Feature\Schema;

use App\Models\Artist;
use App\Models\ArtistExhibitionTranslation;
use App\Models\ArtistTranslation;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtistSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_artist_translation_uniqueness_per_locale_is_enforced(): void
    {
        $artist = Artist::create([]);
        ArtistTranslation::create([
            'artist_id' => $artist->id, 'locale' => 'az', 'slug' => 'nermin-qasimova',
            'first_name' => 'Nərmin', 'last_name' => 'Qasımova',
        ]);

        $this->expectException(QueryException::class);
        ArtistTranslation::create([
            'artist_id' => $artist->id, 'locale' => 'az', 'slug' => 'other-slug',
            'first_name' => 'Nərmin', 'last_name' => 'Qasımova',
        ]);
    }

    public function test_slug_uniqueness_per_locale_is_enforced_across_artists(): void
    {
        $artist1 = Artist::create([]);
        $artist2 = Artist::create([]);

        ArtistTranslation::create([
            'artist_id' => $artist1->id, 'locale' => 'az', 'slug' => 'nermin-qasimova',
            'first_name' => 'Nərmin', 'last_name' => 'Qasımova',
        ]);

        $this->expectException(QueryException::class);
        ArtistTranslation::create([
            'artist_id' => $artist2->id, 'locale' => 'az', 'slug' => 'nermin-qasimova',
            'first_name' => 'Another', 'last_name' => 'Artist',
        ]);
    }

    public function test_artist_soft_deletes(): void
    {
        $artist = Artist::create([]);
        $artist->delete();

        $this->assertSame(0, Artist::count());
        $this->assertSame(1, Artist::withTrashed()->count());
    }

    public function test_artist_exhibition_history_with_translation_is_reachable_from_artist(): void
    {
        $artist = Artist::create([]);
        $exhibition = $artist->exhibitions()->create(['year' => 2022, 'sort_order' => 0]);
        ArtistExhibitionTranslation::create([
            'artist_exhibition_id' => $exhibition->id, 'locale' => 'az',
            'title' => 'Solo sərgi', 'venue' => 'YARAT',
        ]);

        $this->assertCount(1, $artist->fresh()->exhibitions()->with('translations')->get());
        $this->assertSame('YARAT', $exhibition->translations()->first()->venue);
    }
}
