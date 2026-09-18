<?php

namespace Tests\Feature\Database;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Exercises the real backfill and column-drop migration files (not just the
 * extracted NavigationBackfiller logic) against a throwaway in-memory
 * connection seeded with legacy pre-migration data, proving requirement #5
 * from the approved design: the backfill preserves existing navigation before
 * pages.nav_placement/sort_order are dropped.
 *
 * A dedicated scratch connection is used (rather than RefreshDatabase's shared
 * testing connection) because RefreshDatabase always builds the *current*
 * schema, where the legacy columns this test seeds are already gone.
 */
class NavigationBackfillMigrationTest extends TestCase
{
    private string $originalDefaultConnection;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalDefaultConnection = config('database.default');

        config(['database.connections.nav_migration_scratch' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
        DB::purge('nav_migration_scratch');
        config(['database.default' => 'nav_migration_scratch']);

        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('nav_placement')->default('none');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('deleted_at')->nullable();
        });

        Schema::create('navigation_items', function (Blueprint $table) {
            $table->id();
            $table->string('placement');
            $table->string('nav_type');
            $table->unsignedBigInteger('page_id')->nullable();
            $table->string('route_key')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        config(['database.default' => $this->originalDefaultConnection]);
        DB::purge('nav_migration_scratch');

        parent::tearDown();
    }

    public function test_backfill_preserves_existing_navigation_before_columns_are_dropped(): void
    {
        DB::table('pages')->insert([
            ['id' => 1, 'nav_placement' => 'header', 'sort_order' => 1, 'deleted_at' => null],
            ['id' => 2, 'nav_placement' => 'header', 'sort_order' => 0, 'deleted_at' => null],
            ['id' => 3, 'nav_placement' => 'footer', 'sort_order' => 0, 'deleted_at' => null],
            ['id' => 4, 'nav_placement' => 'none', 'sort_order' => 0, 'deleted_at' => null],
            ['id' => 5, 'nav_placement' => 'header', 'sort_order' => 5, 'deleted_at' => now()],
        ]);

        $backfill = require base_path('database/migrations/2026_09_23_000002_backfill_navigation_items_from_pages.php');
        $backfill->up();

        $rows = DB::table('navigation_items')->orderBy('placement')->orderBy('sort_order')->get();
        $this->assertCount(7, $rows); // 2 header pages + 4 header routes + 1 footer page

        $headerPages = $rows->where('placement', 'header')->where('nav_type', 'page')->values();
        $this->assertSame([2, 1], $headerPages->pluck('page_id')->all());
        $this->assertSame([0, 1], $headerPages->pluck('sort_order')->all());

        $headerRoutes = $rows->where('placement', 'header')->where('nav_type', 'route')->values();
        $this->assertSame(['artworks', 'artists', 'exhibitions', 'articles'], $headerRoutes->pluck('route_key')->all());
        $this->assertSame([2, 3, 4, 5], $headerRoutes->pluck('sort_order')->all());

        $footerRows = $rows->where('placement', 'footer')->values();
        $this->assertCount(1, $footerRows);
        $this->assertSame(3, $footerRows->first()->page_id);

        $drop = require base_path('database/migrations/2026_09_23_000003_drop_nav_placement_and_sort_order_from_pages.php');
        $drop->up();

        $this->assertFalse(Schema::hasColumn('pages', 'nav_placement'));
        $this->assertFalse(Schema::hasColumn('pages', 'sort_order'));
        $this->assertSame(7, DB::table('navigation_items')->count());
    }

    public function test_backfill_creates_only_the_four_header_routes_on_a_fresh_database_with_no_pages(): void
    {
        $backfill = require base_path('database/migrations/2026_09_23_000002_backfill_navigation_items_from_pages.php');
        $backfill->up();

        $rows = DB::table('navigation_items')->get();
        $this->assertCount(4, $rows);
        $this->assertTrue($rows->every(fn ($row) => $row->nav_type === 'route' && $row->placement === 'header'));
    }
}
