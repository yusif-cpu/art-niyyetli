<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medium_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medium_id')->constrained('mediums')->cascadeOnDelete();
            $table->string('locale', 5);
            $table->string('name');
            $table->timestamps();

            $table->unique(['medium_id', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medium_translations');
    }
};
