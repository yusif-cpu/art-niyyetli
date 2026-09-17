<?php

namespace App\Support\Seo;

use App\Enums\Locale;
use InvalidArgumentException;

class SeoLabels
{
    // Copied verbatim from resources/js/public/i18n/dictionary.js's `nav.*` keys.
    // If that dictionary's nav labels ever change, update these to match.
    private const LABELS = [
        'az' => [
            'home' => 'Ana səhifə',
            'artworks' => 'Əsərlər',
            'artists' => 'Rəssamlar',
            'exhibitions' => 'Sərgilər',
            'articles' => 'Jurnal',
        ],
        'en' => [
            'home' => 'Home',
            'artworks' => 'Artworks',
            'artists' => 'Artists',
            'exhibitions' => 'Exhibitions',
            'articles' => 'Journal',
        ],
    ];

    public static function label(Locale $locale, string $key): string
    {
        $label = self::LABELS[$locale->value][$key] ?? null;

        if ($label === null) {
            throw new InvalidArgumentException("Unknown SEO label key [{$key}].");
        }

        return $label;
    }
}
