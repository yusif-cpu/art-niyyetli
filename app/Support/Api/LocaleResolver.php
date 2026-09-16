<?php

namespace App\Support\Api;

use App\Enums\Locale;
use Illuminate\Http\Request;

class LocaleResolver
{
    public static function resolve(Request $request): Locale
    {
        $raw = $request->query('locale');

        return is_string($raw) ? (Locale::tryFrom($raw) ?? Locale::Az) : Locale::Az;
    }
}
