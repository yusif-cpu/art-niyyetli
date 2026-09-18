<?php

use App\Support\Navigation\NavigationBackfiller;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * One-time data migration: turns each page's legacy nav_placement/sort_order
     * into navigation_items rows, then appends the 4 special routes to the header
     * in their current hardcoded order — so the live site's rendered navigation is
     * unchanged immediately after deploy. Must run before the later migration that
     * drops pages.nav_placement/sort_order. See NavigationBackfiller for the
     * (independently unit-tested) transformation rules.
     */
    public function up(): void
    {
        $pages = DB::table('pages')
            ->select(['id', 'nav_placement', 'sort_order', 'deleted_at'])
            ->get();

        $rows = NavigationBackfiller::buildRows($pages);

        if ($rows === []) {
            return;
        }

        $now = now();
        foreach ($rows as &$row) {
            $row['created_at'] = $now;
            $row['updated_at'] = $now;
        }

        DB::table('navigation_items')->insert($rows);
    }

    public function down(): void
    {
        DB::table('navigation_items')->truncate();
    }
};
