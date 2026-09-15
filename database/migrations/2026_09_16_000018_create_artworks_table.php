<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('artworks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('artist_id')->constrained()->restrictOnDelete();
            $table->foreignId('medium_id')->constrained('mediums')->restrictOnDelete();
            $table->foreignId('genre_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('year_created');
            $table->decimal('width_cm', 8, 2);
            $table->decimal('height_cm', 8, 2);
            $table->decimal('aspect_ratio', 10, 6);
            $table->decimal('price', 12, 2);
            $table->boolean('show_price')->default(true);
            $table->string('availability')->default('available');
            $table->unsignedSmallInteger('year_sold')->nullable();
            $table->string('inventory_code')->unique();
            $table->boolean('certificate')->default(false);
            $table->text('frame_condition')->nullable();
            $table->text('delivery_note')->nullable();
            $table->boolean('featured')->default(false);
            $table->boolean('show_on_wall')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->index('availability');
            $table->index('featured');
            $table->index('show_on_wall');
            $table->index('is_active');
            $table->index('created_at');
            $table->index('price');
            $table->index('width_cm');
            $table->index('height_cm');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('artworks');
    }
};
