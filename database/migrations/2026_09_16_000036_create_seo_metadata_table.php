<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seo_metadata', function (Blueprint $table) {
            $table->id();
            $table->string('seoable_type');
            $table->unsignedBigInteger('seoable_id');
            $table->string('locale', 5);
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->foreignId('og_image_id')->nullable()->constrained('media')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['seoable_type', 'seoable_id', 'locale'], 'seo_metadata_seoable_locale_unique');
            $table->index(['seoable_type', 'seoable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_metadata');
    }
};
