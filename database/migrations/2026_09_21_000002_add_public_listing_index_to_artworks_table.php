<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The public catalogue (GET /api/v1/artworks) reads `WHERE is_active = 1 ORDER BY sort_order, id LIMIT n`. With only
     * single-column indexes MySQL scans and filesorts every active artwork for each page; this composite serves the
     * filter and the order in one ordered index read (measured on 5 000 artworks: 6.1 ms -> 0.65 ms per query, and it
     * no longer grows with the collection). The homepage's featured strip (which also filters `featured = 1`) can walk
     * the same ordered index and stop at its limit.
     *
     * The single-column `is_active` index is left in place on purpose: it is a left prefix of this one, but it stays the
     * narrower index for `is_active`-only scans and counts, and dropping existing indexes is not part of this change.
     */
    public function up(): void
    {
        Schema::table('artworks', function (Blueprint $table) {
            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::table('artworks', function (Blueprint $table) {
            $table->dropIndex(['is_active', 'sort_order']);
        });
    }
};
