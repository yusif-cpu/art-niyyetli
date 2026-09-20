<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Model;

/**
 * A URL slug: Unicode letters and digits, with single hyphens between them (so the Azerbaijani
 * alphabet is fine, but spaces, `/`, `?`, `#`, dots and other symbols are not). Slugs end up in
 * public URLs, the sitemap and canonical links, where those characters break routing.
 *
 * For a page slug (`$topLevel`), which becomes a top-level path such as `/collectors`, names that
 * the site already uses for its own addresses are refused as well.
 *
 * A record's own existing slugs are always accepted unchanged (pass the record as `$owner`). This is
 * what lets the structural pages keep their `home` and `contact` slugs, and guarantees that saving an
 * unrelated field on an older record can never fail because of a slug that was valid when it was created.
 */
class Slug implements ValidationRule
{
    public const MAX_LENGTH = 191;

    /**
     * Top-level paths the site already answers. (`sitemap.xml` and `robots.txt` need no entry: the
     * format rule already forbids a dot.)
     */
    public const RESERVED = ['admin', 'api', 'artworks', 'artists', 'exhibitions', 'articles', 'contact', 'storage', 'build', 'up', 'home'];

    /** Public page paths beginning with these never reach the SPA: the server keeps `/admin*` and `/api*` for itself. */
    public const RESERVED_PREFIXES = ['admin', 'api'];

    public function __construct(private readonly ?Model $owner = null, private readonly bool $topLevel = false) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return; // the accompanying `string` rule reports this
        }

        $problem = $this->problem($value);

        if ($problem === null || $this->isAnExistingSlugOfTheOwner($value)) {
            return;
        }

        $fail($problem);
    }

    private function problem(string $value): ?string
    {
        if (mb_strlen($value) > self::MAX_LENGTH) {
            return 'The :attribute may not be greater than '.self::MAX_LENGTH.' characters.';
        }

        // `D` stops `$` from also matching before a trailing newline.
        if (preg_match('/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/uD', $value) !== 1) {
            return 'The :attribute may only contain letters and numbers, with single hyphens between them (no spaces, slashes or other symbols).';
        }

        if ($this->topLevel && $this->isReserved($value)) {
            return 'The :attribute is reserved for the site\'s own addresses. Please choose another.';
        }

        return null;
    }

    private function isReserved(string $value): bool
    {
        $value = mb_strtolower($value);

        if (in_array($value, self::RESERVED, true)) {
            return true;
        }

        foreach (self::RESERVED_PREFIXES as $prefix) {
            if (str_starts_with($value, $prefix)) {
                return true;
            }
        }

        return false;
    }

    private function isAnExistingSlugOfTheOwner(string $value): bool
    {
        return $this->owner !== null
            && method_exists($this->owner, 'translations')
            && $this->owner->translations()->where('slug', $value)->exists();
    }
}
