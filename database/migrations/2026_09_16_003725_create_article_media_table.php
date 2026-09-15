<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_media', function (Blueprint $table) {
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->foreignId('media_id')->constrained('media')->restrictOnDelete();
            $table->unsignedInteger('sort_order')->default(0);

            $table->primary(['article_id', 'media_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_media');
    }
};
