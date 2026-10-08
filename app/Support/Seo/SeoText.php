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

        return $entityTitle === '' ? self::SITE_NAME : "{$entityTitle} | ".self::SITE_NAME;
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

    /**
     * Absolute URL for path segments, each percent-encoded, so a Unicode slug or an inventory code holding a space,
     * `?`, `#` or `/` stays one valid path segment. Shared by the canonical URLs and the sitemap so both name the
     * same page identically; segments made of unreserved characters (`AN-2026-014`, `about`) come out unchanged.
     */
    public static function segmentsUrl(string ...$segments): string
    {
        return self::absoluteUrl('/'.implode('/', array_map('rawurlencode', $segments)));
    }

    /**
     * A phone number as the admin wrote it, in the international form structured data should carry
     * ("070 353 05 12" -> "+994703530512"). Mirrors the public frontend's tel: links (lib/format.js phoneHref): a
     * leading 0 (the Azerbaijani trunk prefix) becomes +994, "00" becomes "+", a bare "994..." gets its "+". The
     * converted value is used only when it is a whole Azerbaijani number (+994 and nine digits); anything else is
     * passed on as written with just the whitespace removed, since a wrongly prefixed number dials nothing.
     * Presentation only: the stored setting is never changed. Null for an empty value.
     */
    public static function internationalPhone(?string $phone): ?string
    {
        $written = preg_replace('/\s+/u', '', (string) $phone);
        $digits = preg_replace('/[^\d+]/', '', $written);

        if ($digits === '') {
            return null;
        }

        $converted = match (true) {
            str_starts_with($digits, '+') => $digits,
            str_starts_with($digits, '00') => '+'.substr($digits, 2),
            str_starts_with($digits, '994') => '+'.$digits,
            str_starts_with($digits, '0') => '+994'.substr($digits, 1),
            default => $digits,
        };

        return preg_match('/^\+994\d{9}$/', $converted) === 1 ? $converted : $written;
    }

    public static function ogLocale(Locale $locale): string
    {
        return match ($locale) {
            Locale::Az => 'az_AZ',
            Locale::En => 'en_US',
        };
    }
}
