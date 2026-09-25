<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * "Kolleksionerlər üçün" is not part of the client's requirements. Take it off the site without deleting
     * anything: remove its navigation items (it disappears from the public menus and from Admin → Navigation)
     * and deactivate the page, so /collectors answers 404 and the sitemap and page pickers skip it. The page,
     * its translations and sections stay in the database and can be re-activated from Admin → Pages.
     */
    public function up(): void
    {
        $pageIds = DB::table('pages')->where('type', 'collectors')->pluck('id');

        DB::table('navigation_items')->whereIn('page_id', $pageIds)->delete();
        DB::table('pages')->whereIn('id', $pageIds)->update(['is_active' => false]);
    }

    /**
     * Restores the page and puts it back at the end of the header menu.
     */
    public function down(): void
    {
        $pageIds = DB::table('pages')->where('type', 'collectors')->pluck('id');

        DB::table('pages')->whereIn('id', $pageIds)->update(['is_active' => true]);

        foreach ($pageIds as $pageId) {
            $exists = DB::table('navigation_items')->where('placement', 'header')->where('page_id', $pageId)->exists();

            if (! $exists) {
                DB::table('navigation_items')->insert([
                    'placement' => 'header',
                    'nav_type' => 'page',
                    'page_id' => $pageId,
                    'route_key' => null,
                    'sort_order' => ((int) DB::table('navigation_items')->where('placement', 'header')->max('sort_order')) + 1,
                    'is_visible' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
};
