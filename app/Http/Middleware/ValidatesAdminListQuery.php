<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

/**
 * The admin list/lookup endpoints read a handful of query parameters (search, filters, paging, locale)
 * as plain strings. Sending one as an array (`?search[]=x`, `?locale[k]=x`) used to reach code that
 * expected a string and end in a 500; it is now a normal validation failure (422, the same JSON shape
 * as every other validation error in the API).
 *
 * Only the *type* is checked. Values are not otherwise constrained here, so every request that worked
 * before still behaves exactly as it did: an unknown status or a malformed date is still just a filter
 * that matches nothing, and `per_page`/`page` are still clamped by the controllers.
 */
class ValidatesAdminListQuery
{
    /** Query parameters that the admin GET endpoints read as scalars. */
    private const SCALAR_PARAMETERS = [
        'search', 'locale', 'type', 'status', 'availability', 'subject', 'from', 'to',
        'artwork_id', 'artist_id', 'medium_id', 'genre_id', 'page_id',
        'is_active', 'featured', 'show_on_wall', 'per_page', 'page',
    ];

    /** Longest value any searched column can hold (names, e-mail addresses and file names are varchar(255)). */
    private const SEARCH_MAX_LENGTH = 255;

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('GET') || $request->isMethod('HEAD')) {
            $rules = array_fill_keys(self::SCALAR_PARAMETERS, ['sometimes', 'nullable', 'string']);
            $rules['search'][] = 'max:'.self::SEARCH_MAX_LENGTH;

            Validator::validate($request->query(), $rules);
        }

        return $next($request);
    }
}
