<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enquiry_subject_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enquiry_subject_id')->constrained()->cascadeOnDelete();
            $table->string('locale', 5);
            $table->string('name');
            $table->timestamps();

            $table->unique(['enquiry_subject_id', 'locale'], 'enquiry_subject_translations_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiry_subject_translations');
    }
};
