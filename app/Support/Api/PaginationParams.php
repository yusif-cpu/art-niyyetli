<?php

namespace App\Support\Api;

use Illuminate\Http\Request;

class PaginationParams
{
    public const DEFAULT_PER_PAGE = 24;

    public const MAX_PER_PAGE = 60;

    public static function perPage(Request $request): int
    {
        $value = $request->query('per_page');

        if (! is_numeric($value)) {
            return self::DEFAULT_PER_PAGE;
        }

        $value = (int) $value;

        return ($value < 1 || $value > self::MAX_PER_PAGE) ? self::DEFAULT_PER_PAGE : $value;
    }
}
