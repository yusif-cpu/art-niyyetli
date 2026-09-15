<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('artist_award_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('artist_award_id')->constrained()->cascadeOnDelete();
            $table->string('locale', 5);
            $table->string('title');
            $table->timestamps();

            $table->unique(['artist_award_id', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('artist_award_translations');
    }
};
