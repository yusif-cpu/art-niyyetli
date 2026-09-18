<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->string('nav_placement')->default('none')->after('is_active');
            $table->unsignedInteger('sort_order')->default(0)->after('nav_placement');
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropColumn(['nav_placement', 'sort_order']);
        });
    }
};
