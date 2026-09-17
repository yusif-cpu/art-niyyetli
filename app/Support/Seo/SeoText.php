<?php

namespace App\Support\Seo;

use App\Enums\Locale;
use Illuminate\Support\Str;

class SeoText
{
    public const SITE_NAME = 'ArtNiyyətli';

    public static function pageTitle(?string $entityTitle): string
    {
        $entityTitle = trim((string) $entityTitle);

        return $entityTitle === '' ? self::SITE_NAME : "{$entityTitle} — ".self::SITE_NAME;
    }

    public static function description(?string $text, int $limit = 160): ?string
    {
        $clean = trim(strip_tags((string) $text));

        return $clean === '' ? null : Str::limit($clean, $limit);
    }

    public static function absoluteUrl(string $path): string
    {
        $base = rtrim((string) config('app.url'), '/');
        $path = ltrim($path, '/');

        return $path === '' ? "{$base}/" : "{$base}/{$path}";
    }

    public static function ogLocale(Locale $locale): string
    {
        return match ($locale) {
            Locale::Az => 'az_AZ',
            Locale::En => 'en_US',
        };
    }
}
