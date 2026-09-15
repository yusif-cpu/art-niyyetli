<?php

namespace Tests\Feature\Schema;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Genre;
use App\Models\Medium;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ExhibitionSchemaTest extends TestCase
{
    use RefreshDatabase;

    private function makeExhibition(): Exhibition
    {
        return Exhibition::create([
            'type' => 'exhibition', 'status' => 'upcoming',
            'start_date' => '2026-10-01', 'end_date' => '2026-10-31',
        ]);
    }

    private function makeArtwork(Artist $artist): Artwork
    {
        return Artwork::create([
            'artist_id' => $artist->id,
            'medium_id' => Medium::create(['slug' => 'oil-on-canvas-'.uniqid()])->id,
            'genre_id' => Genre::create(['slug' => 'abstraction-'.uniqid()])->id,
            'year_created' => 2023, 'width_cm' => 80, 'height_cm' => 100,
            'price' => 5000, 'inventory_code' => 'AN-'.uniqid(),
        ]);
    }

    public function test_artists_and_artworks_can_be_attached_and_are_navigable_both_directions(): void
    {
        $exhibition = $this->makeExhibition();
        $artist = Artist::create([]);
        $artwork = $this->makeArtwork($artist);

        $exhibition->artists()->attach($artist, ['sort_order' => 0]);
        $exhibition->artworks()->attach($artwork, ['sort_order' => 0]);

        $this->assertCount(1, $exhibition->fresh()->artists);
        $this->assertCount(1, $exhibition->fresh()->artworks);
        $this->assertCount(1, $artist->exhibitionAppearances);
        $this->assertCount(1, $artwork->exhibitions);
    }

    public function test_deleting_an_artwork_linked_to_an_exhibition_is_blocked(): void
    {
        $exhibition = $this->makeExhibition();
        $artwork = $this->makeArtwork(Artist::create([]));
        $exhibition->artworks()->attach($artwork, ['sort_order' => 0]);

        $this->expectException(QueryException::class);
        DB::table('artworks')->where('id', $artwork->id)->delete();
    }

    public function test_deleting_the_exhibition_removes_its_pivot_rows_but_not_the_artwork(): void
    {
        $exhibition = $this->makeExhibition();
        $artwork = $this->makeArtwork(Artist::create([]));
        $exhibition->artworks()->attach($artwork, ['sort_order' => 0]);

        DB::table('exhibitions')->where('id', $exhibition->id)->delete();

        $this->assertSame(0, DB::table('exhibition_artworks')->count());
        $this->assertNotNull(Artwork::find($artwork->id));
    }
}
