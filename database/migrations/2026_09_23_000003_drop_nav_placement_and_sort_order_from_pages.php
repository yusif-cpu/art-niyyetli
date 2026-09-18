<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Safe to run only after the backfill migration above has copied every page's
     * nav_placement/sort_order into navigation_items — see
     * tests/Feature/Database/NavigationBackfillMigrationTest.php, which proves the
     * backfill preserves this data before this migration removes it.
     */
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropColumn(['nav_placement', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->string('nav_placement')->default('none')->after('is_active');
            $table->unsignedInteger('sort_order')->default(0)->after('nav_placement');
        });
    }
};
