<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_section_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('page_section_id')->constrained()->cascadeOnDelete();
            $table->string('locale', 5);
            $table->string('heading');
            $table->longText('body');
            $table->timestamps();

            $table->unique(['page_section_id', 'locale'], 'page_section_translations_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_section_translations');
    }
};
