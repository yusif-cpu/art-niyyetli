<?php

namespace Tests\Feature\Schema;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use App\Models\Genre;
use App\Models\Medium;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EnquirySchemaTest extends TestCase
{
    use RefreshDatabase;

    private function makeArtwork(): Artwork
    {
        return Artwork::create([
            'artist_id' => Artist::create([])->id,
            'medium_id' => Medium::create(['slug' => 'oil-on-canvas'])->id,
            'genre_id' => Genre::create(['slug' => 'abstraction'])->id,
            'year_created' => 2023, 'width_cm' => 80, 'height_cm' => 100,
            'price' => 5000, 'inventory_code' => 'AN-2025-014',
        ]);
    }

    public function test_enquiry_against_an_artwork_is_reachable_from_both_sides(): void
    {
        $artwork = $this->makeArtwork();
        $subject = EnquirySubject::create(['key' => 'buy']);

        $enquiry = Enquiry::create([
            'enquiry_subject_id' => $subject->id,
            'artwork_id' => $artwork->id,
            'inventory_code' => 'AN-2025-014',
            'submitted_at' => now(),
            'name' => 'Jane Buyer',
            'contact' => 'jane@example.com',
            'message' => 'Interested in this piece.',
        ]);

        $this->assertTrue($enquiry->artwork->is($artwork));
        $this->assertCount(1, $artwork->fresh()->enquiries);
    }

    public function test_deleting_an_artwork_with_enquiries_is_blocked(): void
    {
        $artwork = $this->makeArtwork();
        $subject = EnquirySubject::create(['key' => 'buy']);
        Enquiry::create([
            'enquiry_subject_id' => $subject->id, 'artwork_id' => $artwork->id,
            'submitted_at' => now(), 'name' => 'Jane', 'contact' => 'jane@example.com',
            'message' => 'Interested.',
        ]);

        $this->expectException(QueryException::class);
        DB::table('artworks')->where('id', $artwork->id)->delete();
    }

    public function test_inventory_code_is_a_snapshot_independent_of_the_artwork(): void
    {
        $artwork = $this->makeArtwork();
        $subject = EnquirySubject::create(['key' => 'buy']);

        $enquiry = Enquiry::create([
            'enquiry_subject_id' => $subject->id, 'artwork_id' => $artwork->id,
            'inventory_code' => 'AN-2025-014-SNAPSHOT', 'submitted_at' => now(),
            'name' => 'Jane', 'contact' => 'jane@example.com', 'message' => 'Interested.',
        ]);

        $this->assertNotSame($artwork->inventory_code, $enquiry->inventory_code);
    }
}
