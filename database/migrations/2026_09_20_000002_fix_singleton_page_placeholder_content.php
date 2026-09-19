<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * PageSeeder used to seed the same Azerbaijani placeholder sentence for every
     * locale, so the English home/about/collectors/contact pages read e.g. "For
     * collectors səhifəsinin məzmunu tezliklə əlavə olunacaq." This replaces that
     * exact seeded string with proper English copy. Rows whose content differs
     * (i.e. anything the client has already edited) never match and are untouched.
     */
    private const ENGLISH_TITLES = [
        'home' => 'Home',
        'about' => 'About',
        'collectors' => 'For collectors',
        'contact' => 'Contact',
    ];

    public function up(): void
    {
        foreach (self::ENGLISH_TITLES as $type => $englishTitle) {
            $pageIds = DB::table('pages')->where('type', $type)->pluck('id');

            if ($pageIds->isEmpty()) {
                continue;
            }

            DB::table('page_translations')
                ->whereIn('page_id', $pageIds)
                ->where('locale', 'en')
                ->where('content', $englishTitle.' səhifəsinin məzmunu tezliklə əlavə olunacaq.')
                ->update([
                    'content' => sprintf('Content for the "%s" page will be added soon.', $englishTitle),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // Data repair only; the previous mixed-language placeholder is not restored.
    }
};
