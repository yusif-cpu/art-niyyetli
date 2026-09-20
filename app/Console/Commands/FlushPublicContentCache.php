<?php

namespace App\Console\Commands;

use App\Support\Cache\PublicContentCache;
use Illuminate\Console\Command;

class FlushPublicContentCache extends Command
{
    protected $signature = 'public-cache:flush';

    protected $description = 'Invalidate the cached public content (site settings, navigation, homepage, sitemap) immediately';

    public function handle(PublicContentCache $cache): int
    {
        $cache->bump();

        $this->info('Public content cache invalidated.');
        $this->line('Browsers and shared caches may keep a public API response for up to PUBLIC_API_CACHE_TTL seconds.');

        return self::SUCCESS;
    }
}
