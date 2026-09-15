<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_range_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('price_range_id')->constrained()->cascadeOnDelete();
            $table->string('locale', 5);
            $table->string('name');
            $table->timestamps();

            $table->unique(['price_range_id', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_range_translations');
    }
};
