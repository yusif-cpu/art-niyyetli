<?php

namespace App\Support\Cache;

use Closure;
use Illuminate\Contracts\Cache\Factory;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * The application cache for public, identical-for-everyone content (see config/public_cache.php).
 *
 * Every entry is stamped with a content version. Bumping the version (an admin write, or
 * `php artisan public-cache:flush`) makes every existing entry a miss at once, without enumerating or deleting keys,
 * so invalidation stays in one place whichever tables an edit touched.
 *
 * Each payload lives under one stable key and is overwritten in place when it is rebuilt. The version is deliberately
 * NOT part of the key: neither the database nor the file cache store ever removes an expired entry that is not read
 * again, so versioned keys would leave a new set of dead rows or files behind after every admin write.
 *
 * Only store plain data (scalars, arrays, JSON/XML strings), never Eloquent models or resources: the cache does not
 * unserialize classes (cache.serializable_classes), and a cached model would carry stale relations.
 */
class PublicContentCache
{
    private const VERSION_KEY = 'public-content:version';

    private const ENTRY_PREFIX = 'public-content:entry:';

    public function __construct(private Factory $cache) {}

    /**
     * The value cached under $key for the current content version, computed by $callback on a miss.
     *
     * The version is read before the callback runs, so a value computed while an edit was being made is stamped with
     * the old version and is never served after the bump.
     *
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public function remember(string $key, int $ttl, Closure $callback): mixed
    {
        $entryKey = self::ENTRY_PREFIX.$key;

        // The cache is an optimisation: if its store is unavailable the content is simply built from the database, as
        // it was before caching existed, and the failure is logged. A callback's own exceptions are never swallowed.
        try {
            $version = $this->version();
            $entry = $this->store()->get($entryKey);

            if (is_array($entry) && ($entry['version'] ?? null) === $version && array_key_exists('value', $entry)) {
                return $entry['value'];
            }
        } catch (Throwable $e) {
            $this->storeFailed('read', $e);

            return $callback();
        }

        $value = $callback();

        try {
            $this->store()->put($entryKey, ['version' => $version, 'value' => $value], $ttl);
        } catch (Throwable $e) {
            $this->storeFailed('write', $e);
        }

        return $value;
    }

    /** The current content version: an opaque token that changes on every bump. */
    public function version(): string
    {
        // Never expires. If it is ever lost, a new token is created, so entries from before the loss stay unreachable.
        return (string) $this->store()->rememberForever(self::VERSION_KEY, fn () => $this->newVersion());
    }

    /**
     * Invalidates every cached public payload.
     *
     * Never throws: the admin write that triggers it has already been committed, so a cache outage must not turn a
     * saved change into a 500 (a retry would duplicate it). If the store is down nothing is being served from it
     * either; it is logged as an error because entries that survive the outage stay valid only until their TTL.
     */
    public function bump(): string
    {
        $version = $this->newVersion();

        try {
            $this->store()->forever(self::VERSION_KEY, $version);
        } catch (Throwable $e) {
            $this->storeFailed('invalidate', $e, 'error');
        }

        return $version;
    }

    private function newVersion(): string
    {
        return (string) Str::ulid();
    }

    private function storeFailed(string $operation, Throwable $e, string $level = 'warning'): void
    {
        Log::log($level, "Public content cache {$operation} failed; serving without the cache.", ['exception' => $e]);
    }

    private function store(): Repository
    {
        return $this->cache->store();
    }
}
