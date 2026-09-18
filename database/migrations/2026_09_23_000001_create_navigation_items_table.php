<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('navigation_items', function (Blueprint $table) {
            $table->id();
            $table->string('placement');
            $table->string('nav_type');
            $table->foreignId('page_id')->nullable()->constrained('pages')->cascadeOnDelete();
            $table->string('route_key')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->timestamps();

            // NULLs are distinct in a unique index on both MySQL and SQLite, so these
            // only block a real duplicate (same page, or same route, in the same
            // placement) without limiting how many rows of the other type coexist.
            $table->unique(['placement', 'page_id']);
            $table->unique(['placement', 'route_key']);
            $table->index(['placement', 'sort_order']);
        });

        // Defense-in-depth against raw/manual SQL bypassing Eloquent: production runs
        // MySQL (which supports CHECK), while tests run SQLite, whose ALTER TABLE
        // cannot add a CHECK constraint to an existing table. The invariant this
        // guards is enforced identically on both drivers by NavigationItem's
        // `saving` event and by the Store/UpdateNavigationItemRequest validation.
        if (DB::getDriverName() === 'mysql') {
            DB::statement(<<<'SQL'
                ALTER TABLE navigation_items
                ADD CONSTRAINT navigation_items_type_target_chk CHECK (
                    (nav_type = 'page' AND page_id IS NOT NULL AND route_key IS NULL)
                    OR (nav_type = 'route' AND route_key IS NOT NULL AND page_id IS NULL)
                )
            SQL);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('navigation_items');
    }
};
