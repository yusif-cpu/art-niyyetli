<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('artwork_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('artwork_id')->constrained()->cascadeOnDelete();
            $table->string('locale', 5);
            $table->string('slug');
            $table->string('title');
            $table->text('short_description');
            $table->text('provenance');
            $table->timestamps();

            $table->unique(['artwork_id', 'locale']);
            $table->unique(['slug', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('artwork_translations');
    }
};
