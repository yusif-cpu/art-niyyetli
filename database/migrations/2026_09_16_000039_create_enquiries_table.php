<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enquiries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enquiry_subject_id')->constrained()->restrictOnDelete();
            $table->foreignId('artwork_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('inventory_code')->nullable();
            $table->timestamp('submitted_at');
            $table->string('name');
            $table->string('contact');
            $table->text('message');
            $table->string('status')->default('new');
            $table->text('internal_note')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
            $table->index('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
