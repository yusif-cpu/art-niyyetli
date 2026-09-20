<?php

namespace App\Support\Api;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;

/**
 * Safe reading of free-text list filters (the admin `search` box).
 *
 * Type confusion (`?search[]=x`) is rejected with a 422 before a controller runs, by
 * App\Http\Middleware\ValidatesAdminListQuery; these helpers additionally make sure the text the
 * user typed is matched literally, so `%` and `_` are ordinary characters and not LIKE wildcards.
 */
class QueryParams
{
    /**
     * The character that escapes `%` and `_` in a LIKE pattern. Deliberately not a backslash: MySQL treats
     * backslash specially inside string literals and SQLite has no default escape character, so a
     * backslash would need different SQL per database. `!` means the same thing in both.
     */
    private const LIKE_ESCAPE = '!';

    /** The trimmed value of a text filter, or null when it is absent, empty or not a plain string. */
    public static function search(Request $request, string $key = 'search'): ?string
    {
        $value = $request->query($key);

        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    /** Escapes LIKE wildcards so the term is matched literally. */
    public static function escapeLike(string $term): string
    {
        $escape = self::LIKE_ESCAPE;

        return str_replace([$escape, '%', '_'], [$escape.$escape, $escape.'%', $escape.'_'], $term);
    }

    /** Adds `column LIKE %term% ESCAPE '!'`, matching the term literally (a substring match, as before). */
    public static function whereLike(EloquentBuilder|QueryBuilder $query, string $column, string $term, string $boolean = 'and'): EloquentBuilder|QueryBuilder
    {
        $grammar = ($query instanceof EloquentBuilder ? $query->getQuery() : $query)->getGrammar();

        return $query->whereRaw(
            $grammar->wrap($column)." like ? escape '".self::LIKE_ESCAPE."'",
            ['%'.self::escapeLike($term).'%'],
            $boolean
        );
    }
}
