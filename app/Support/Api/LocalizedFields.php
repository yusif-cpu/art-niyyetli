<?php

namespace App\Support\Api;

use App\Enums\Locale;
use Illuminate\Support\Collection;

class LocalizedFields
{
    /**
     * Field-level EN -> AZ fallback: each field is resolved independently,
     * never the whole translation row at once.
     *
     * @param  Collection<int, object>  $translations  rows with a `locale` (Locale enum) property
     * @param  array<int, string>  $fields
     * @return array<string, mixed>
     */
    public static function resolve(Collection $translations, Locale $locale, array $fields): array
    {
        $az = $translations->first(fn ($t) => $t->locale === Locale::Az);
        $primary = $locale === Locale::En
            ? $translations->first(fn ($t) => $t->locale === Locale::En)
            : $az;

        $result = [];

        foreach ($fields as $field) {
            $value = $primary?->{$field};

            if ($value === null || $value === '') {
                $value = $az?->{$field};
            }

            $result[$field] = ($value === null || $value === '') ? null : $value;
        }

        return $result;
    }
}
