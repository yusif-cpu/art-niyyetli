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
use App\Support\Seo\SeoText;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $urls = array_merge(
            [['loc' => SeoText::absoluteUrl('/'), 'lastmod' => null]],
            $this->staticPages(),
            $this->artworks(),
            $this->artists(),
            $this->exhibitions(),
            $this->articles(),
        );

        $xml = $this->render($urls);

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    private function staticPages(): array
    {
        return Page::query()
            ->where('is_active', true)
            ->where('type', '!=', PageType::Home)
            ->with('translations')
            ->get()
            ->map(function (Page $page) {
                $slug = $page->translations->firstWhere('locale', Locale::Az)?->slug
                    ?? $page->translations->first()?->slug;

                return $slug ? ['loc' => SeoText::absoluteUrl("/{$slug}"), 'lastmod' => $page->updated_at] : null;
            })
            ->filter()
            ->values()
            ->all();
    }

    private function artworks(): array
    {
        return Artwork::query()->where('is_active', true)->get()
            ->map(fn (Artwork $a) => ['loc' => SeoText::absoluteUrl("/artworks/{$a->inventory_code}"), 'lastmod' => $a->updated_at])
            ->all();
    }

    private function artists(): array
    {
        return Artist::query()->where('is_active', true)->with('translations')->get()
            ->map(function (Artist $artist) {
                $slug = $artist->translations->firstWhere('locale', Locale::Az)?->slug
                    ?? $artist->translations->first()?->slug;

                return $slug ? ['loc' => SeoText::absoluteUrl("/artists/{$slug}"), 'lastmod' => $artist->updated_at] : null;
            })
            ->filter()->values()->all();
    }

    private function exhibitions(): array
    {
        return Exhibition::query()->where('is_active', true)->with('translations')->get()
            ->map(function (Exhibition $exhibition) {
                $slug = $exhibition->translations->firstWhere('locale', Locale::Az)?->slug
                    ?? $exhibition->translations->first()?->slug;

                return $slug ? ['loc' => SeoText::absoluteUrl("/exhibitions/{$slug}"), 'lastmod' => $exhibition->updated_at] : null;
            })
            ->filter()->values()->all();
    }

    private function articles(): array
    {
        return Article::query()
            ->where('status', ArticleStatus::Published)->where('is_active', true)
            ->whereNotNull('published_at')->where('published_at', '<=', now())
            ->with('translations')
            ->get()
            ->map(function (Article $article) {
                $slug = $article->translations->firstWhere('locale', Locale::Az)?->slug
                    ?? $article->translations->first()?->slug;

                return $slug ? ['loc' => SeoText::absoluteUrl("/articles/{$slug}"), 'lastmod' => $article->updated_at] : null;
            })
            ->filter()->values()->all();
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
