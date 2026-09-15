<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exhibitions', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('status')->default('upcoming');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->index('status');
            $table->index('start_date');
            $table->index('end_date');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exhibitions');
    }
};
