<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('media_id')->constrained()->cascadeOnDelete();
            $table->string('locale', 5);
            $table->string('alt_text')->nullable();
            $table->timestamps();

            $table->unique(['media_id', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_translations');
    }
};
