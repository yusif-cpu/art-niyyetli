<?php

namespace Tests\Feature\Database;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Phase 12 Task 11: the composite (is_active, sort_order) index that serves the public catalogue's
 * `WHERE is_active = 1 ORDER BY sort_order, id LIMIT n` in one ordered read. Proves the migration adds the index on a
 * clean schema and that it can be rolled back and re-applied.
 */
class PublicListingIndexMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_index_exists_after_migrating_and_the_migration_is_reversible(): void
    {
        $this->assertTrue(Schema::hasIndex('artworks', ['is_active', 'sort_order']));

        $migration = $this->migration();

        $migration->down();
        $this->assertFalse(Schema::hasIndex('artworks', ['is_active', 'sort_order']));
        $this->assertTrue(Schema::hasIndex('artworks', ['is_active']), 'Rolling back must not touch the pre-existing single-column index.');

        $migration->up();
        $this->assertTrue(Schema::hasIndex('artworks', ['is_active', 'sort_order']));
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_09_21_000002_add_public_listing_index_to_artworks_table.php');
    }
}
