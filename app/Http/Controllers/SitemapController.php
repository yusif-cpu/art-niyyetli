<?php

namespace App\Http\Controllers;

use App\Enums\ArticleStatus;
use App\Enums\Locale;
use App\Enums\PageType;
use App\Models\Article;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Page;
use App\Support\Cache\PublicContentCache;
use App\Support\Seo\SeoText;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * Rows read per query. Records are streamed in id order, so memory stays flat however many exist and the
     * query count grows by one (per relation) per CHUNK rows, never per row.
     */
    private const CHUNK = 1000;

    /*
     * The sitemap protocol caps a file at 50 000 URLs. This gallery is nowhere near that (5 000 artworks plus their
     * artists, exhibitions and articles come to ~6 500 URLs, measured in Phase 12 Task 11), so no sitemap index is
     * generated. If a collection ever approaches the cap, split this into a sitemap index of per-section files.
     */

    public function __construct(private PublicContentCache $cache) {}

    public function index(): Response
    {
        // The same document for every visitor, so it is cached as a string; an admin write invalidates it.
        $xml = $this->cache->remember('sitemap', (int) config('public_cache.ttl.sitemap'), function () {
            $urls = array_merge(
                [['loc' => SeoText::absoluteUrl('/'), 'lastmod' => null]],
                $this->staticPages(),
                $this->artworks(),
                $this->artists(),
                $this->exhibitions(),
                $this->articles(),
            );

            return $this->render($urls);
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    private function staticPages(): array
    {
        return $this->translated(
            Page::query()->where('is_active', true)->where('type', '!=', PageType::Home),
            'page_id',
            null,
        );
    }

    private function artworks(): array
    {
        $urls = [];

        Artwork::query()->where('is_active', true)->select(['id', 'inventory_code', 'updated_at'])
            ->lazyById(self::CHUNK)
            ->each(function (Artwork $artwork) use (&$urls) {
                $urls[] = ['loc' => $this->url('artworks', $artwork->inventory_code), 'lastmod' => $artwork->updated_at];
            });

        return $urls;
    }

    private function artists(): array
    {
        return $this->translated(Artist::query()->where('is_active', true), 'artist_id', 'artists');
    }

    private function exhibitions(): array
    {
        return $this->translated(Exhibition::query()->where('is_active', true), 'exhibition_id', 'exhibitions');
    }

    private function articles(): array
    {
        return $this->translated(
            Article::query()
                ->where('status', ArticleStatus::Published)->where('is_active', true)
                ->whereNotNull('published_at')->where('published_at', '<=', now()),
            'article_id',
            'articles',
        );
    }

    /**
     * One URL per record that has a slug: the Azerbaijani one, else the first available. Only the columns the URL
     * needs are read.
     *
     * @param  Builder<Model>  $query  a filtered query on a model with a `translations` relation
     * @param  string|null  $section  the path prefix (`artists`), or null for a top-level page path
     */
    private function translated(Builder $query, string $foreignKey, ?string $section): array
    {
        $urls = [];

        $query->select(['id', 'updated_at'])
            ->with("translations:{$foreignKey},locale,slug")
            ->lazyById(self::CHUNK)
            ->each(function (Model $model) use (&$urls, $section) {
                $slug = $model->translations->firstWhere('locale', Locale::Az)?->slug
                    ?? $model->translations->first()?->slug;

                if ($slug) {
                    $urls[] = ['loc' => $section === null ? $this->url($slug) : $this->url($section, $slug), 'lastmod' => $model->updated_at];
                }
            });

        return $urls;
    }

    /** Absolute URL for path segments, each percent-encoded (slugs may hold Unicode letters; codes may hold anything). */
    private function url(string ...$segments): string
    {
        return SeoText::segmentsUrl(...$segments);
    }

    private function render(array $urls): string
    {
        $xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

        foreach ($urls as $url) {
            $xml[] = '  <url>';
            $xml[] = '    <loc>'.htmlspecialchars($url['loc'], ENT_XML1).'</loc>';
            if ($url['lastmod']) {
                $xml[] = '    <lastmod>'.$url['lastmod']->toAtomString().'</lastmod>';
            }
            $xml[] = '  </url>';
        }

        $xml[] = '</urlset>';

        return implode("\n", $xml);
    }
}
