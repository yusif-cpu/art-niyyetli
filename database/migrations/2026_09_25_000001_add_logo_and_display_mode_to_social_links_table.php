<?php

use App\Enums\LogoDisplayMode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_links', function (Blueprint $table) {
            $table->foreignId('logo_media_id')->nullable()->after('url')->constrained('media')->restrictOnDelete();
            $table->string('display_mode', 20)->default(LogoDisplayMode::LogoText->value)->after('logo_media_id');
        });
    }

    public function down(): void
    {
        Schema::table('social_links', function (Blueprint $table) {
            $table->dropConstrainedForeignId('logo_media_id');
            $table->dropColumn('display_mode');
        });
    }
};
