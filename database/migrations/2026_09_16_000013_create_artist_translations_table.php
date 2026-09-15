<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('artist_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('artist_id')->constrained()->cascadeOnDelete();
            $table->string('locale', 5);
            $table->string('slug');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('birth_place')->nullable();
            $table->string('direction')->nullable();
            $table->longText('biography')->nullable();
            $table->longText('artistic_approach')->nullable();
            $table->timestamps();

            $table->unique(['artist_id', 'locale']);
            $table->unique(['slug', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('artist_translations');
    }
};
