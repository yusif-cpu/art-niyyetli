<?php

namespace Tests\Unit\Services;

use App\Models\Artwork;
use App\Services\Admin\InventoryCodeGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryCodeGeneratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_format_matches_the_an_year_sequence_pattern(): void
    {
        $generator = new InventoryCodeGenerator;

        $this->assertSame('AN-2026-007', $generator->format(2026, 7));
    }

    public function test_suggested_sequence_starts_after_existing_rows_for_that_year(): void
    {
        $generator = new InventoryCodeGenerator;

        $this->assertSame(1, $generator->suggestSequenceStart(2031));

        Artwork::factory()->create(['created_at' => '2031-05-01']);
        Artwork::factory()->create(['created_at' => '2031-06-01']);

        $this->assertSame(3, $generator->suggestSequenceStart(2031));
    }
}
