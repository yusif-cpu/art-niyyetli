<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exhibition_artworks', function (Blueprint $table) {
            $table->foreignId('exhibition_id')->constrained()->cascadeOnDelete();
            $table->foreignId('artwork_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('sort_order')->default(0);

            $table->primary(['exhibition_id', 'artwork_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exhibition_artworks');
    }
};
