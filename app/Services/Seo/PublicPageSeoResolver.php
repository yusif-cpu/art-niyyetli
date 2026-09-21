<?php

namespace App\Services\Seo;

use App\Enums\ArticleStatus;
use App\Enums\Locale;
use App\Enums\PageType;
use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Models\Article;
use App\Models\ArticleTranslation;
use App\Models\Artist;
use App\Models\ArtistTranslation;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\ExhibitionTranslation;
use App\Models\Page;
use App\Models\PageTranslation;
use App\Services\Admin\SiteSettingService;
use App\Support\Api\LocalizedFields;
use App\Support\Seo\PageSeo;
use App\Support\Seo\SeoLabels;
use App\Support\Seo\SeoText;

class PublicPageSeoResolver
{
    use ResolvesMediaUrl;

    public function __construct(private SiteSettingService $siteSettings) {}

    public function resolve(array $segments, Locale $locale): PageSeo
    {
        return match (true) {
            $segments === [] => $this->home($locale),
            $segments === ['artworks'] => $this->catalogue($locale),
            count($segments) === 2 && $segments[0] === 'artworks' => $this->artworkDetail($segments[1], $locale),
            $segments === ['artists'] => $this->artists($locale),
            count($segments) === 2 && $segments[0] === 'artists' => $this->artistDetail($segments[1], $locale),
            $segments === ['exhibitions'] => $this->exhibitions($locale),
            count($segments) === 2 && $segments[0] === 'exhibitions' => $this->exhibitionDetail($segments[1], $locale),
            $segments === ['articles'] => $this->articles($locale),
            count($segments) === 2 && $segments[0] === 'articles' => $this->articleDetail($segments[1], $locale),
            count($segments) === 1 => $this->staticPage($segments[0], $locale),
            default => $this->notFound($locale),
        };
    }

    private function home(Locale $locale): PageSeo
    {
        $canonical = SeoText::absoluteUrl('/');

        $home = Page::query()
            ->where('type', PageType::Home)
            ->where('is_active', true)
            ->with(['sections' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'), 'sections.translations'])
            ->first();

        $hero = $home?->sections->first();
        $heroFields = $hero ? LocalizedFields::resolve($hero->translations, $locale, ['heading', 'body']) : ['heading' => null, 'body' => null];

        // The hero heading is itself the site's brand statement (e.g. "ArtNiyyətli"),
        // so unlike every other page's title this is used as-is rather than through
        // SeoText::pageTitle(), which would double-append the site name.
        $heading = trim((string) $heroFields['heading']);
        $title = $heading === '' ? SeoText::SITE_NAME : $heading;
        $description = SeoText::description($heroFields['body']);
        $ogImageUrl = $this->firstFeaturedArtworkImageUrl();
        $settings = $this->siteSettings->all();

        return new PageSeo(
            title: $title,
            description: $description,
            canonicalUrl: $canonical,
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: $ogImageUrl,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: [
                '@context' => 'https://schema.org',
                '@graph' => array_values(array_filter([
                    ['@type' => 'WebSite', 'name' => SeoText::SITE_NAME, 'url' => $canonical],
                    array_filter([
                        '@type' => 'Organization',
                        'name' => SeoText::SITE_NAME,
                        'url' => $canonical,
                        'email' => $settings['contact_email'] ?? null,
                        'telephone' => $settings['phone'] ?? null,
                    ]),
                ])),
            ],
        );
    }

    private function staticPage(string $slug, Locale $locale): PageSeo
    {
        $translation = PageTranslation::query()->where('slug', $slug)->first();
        $page = $translation
            ? Page::query()->where('id', $translation->page_id)->where('is_active', true)->with('translations')->first()
            : null;

        if (! $page) {
            return $this->notFound($locale);
        }

        $fields = LocalizedFields::resolve($page->translations, $locale, ['title', 'content']);
        $override = $page->seoOverride($locale);

        return new PageSeo(
            title: SeoText::pageTitle($override?->title ?? $fields['title']),
            description: SeoText::description($override?->description ?? $fields['content']),
            canonicalUrl: SeoText::segmentsUrl($slug),
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: null,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: null,
        );
    }

    private function catalogue(Locale $locale): PageSeo
    {
        $canonical = SeoText::absoluteUrl('/artworks');
        $count = Artwork::query()->where('is_active', true)->count();
        $description = $locale === Locale::En
            ? "Explore a catalogue of {$count} artworks."
            : "{$count} əsərdən ibarət kataloqu kəşf edin.";

        return new PageSeo(
            title: SeoText::pageTitle(SeoLabels::label($locale, 'artworks')),
            description: $description,
            canonicalUrl: $canonical,
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: $this->firstArtworkCardImageUrl(),
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: null,
        );
    }

    private function artworkDetail(string $inventoryCode, Locale $locale): PageSeo
    {
        $artwork = Artwork::query()
            ->where('inventory_code', $inventoryCode)
            ->where('is_active', true)
            ->with(['translations', 'artist.translations', 'images' => fn ($q) => $q->orderBy('sort_order'), 'images.media.variants'])
            ->first();

        if (! $artwork) {
            return $this->notFound($locale);
        }

        $fields = LocalizedFields::resolve($artwork->translations, $locale, ['title', 'short_description']);
        $artistFields = LocalizedFields::resolve($artwork->artist->translations, $locale, ['first_name', 'last_name']);
        $artistName = trim(($artistFields['first_name'] ?? '').' '.($artistFields['last_name'] ?? ''));
        $override = $artwork->seoOverride($locale);

        $mainImage = $artwork->images->firstWhere('is_main', true) ?? $artwork->images->first();
        $ogImageUrl = $override?->ogImage
            ? $this->mediaVariantUrl($override->ogImage->loadMissing('variants'), 'full')
            : ($mainImage ? $this->mediaVariantUrl($mainImage->media, 'full') : null);

        $title = $override?->title ?? $fields['title'];
        $description = SeoText::description($override?->description ?? $fields['short_description']);
        $canonical = SeoText::segmentsUrl('artworks', $inventoryCode);

        return new PageSeo(
            title: SeoText::pageTitle($title),
            description: $description,
            canonicalUrl: $canonical,
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: $ogImageUrl,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: [
                '@context' => 'https://schema.org',
                '@graph' => [
                    array_filter([
                        '@type' => 'VisualArtwork',
                        'name' => $title,
                        'image' => $ogImageUrl,
                        'creator' => $artistName !== '' ? ['@type' => 'Person', 'name' => $artistName] : null,
                        'dateCreated' => $artwork->year_created,
                        'description' => $description,
                    ]),
                    [
                        '@type' => 'BreadcrumbList',
                        'itemListElement' => [
                            ['@type' => 'ListItem', 'position' => 1, 'name' => SeoLabels::label($locale, 'home'), 'item' => SeoText::absoluteUrl('/')],
                            ['@type' => 'ListItem', 'position' => 2, 'name' => SeoLabels::label($locale, 'artworks'), 'item' => SeoText::absoluteUrl('/artworks')],
                            ['@type' => 'ListItem', 'position' => 3, 'name' => $title, 'item' => $canonical],
                        ],
                    ],
                ],
            ],
        );
    }

    private function artists(Locale $locale): PageSeo
    {
        $canonical = SeoText::absoluteUrl('/artists');
        $count = Artist::query()->where('is_active', true)->count();
        $description = $locale === Locale::En
            ? "Meet {$count} artists."
            : "{$count} rəssamla tanış olun.";

        return new PageSeo(
            title: SeoText::pageTitle(SeoLabels::label($locale, 'artists')),
            description: $description,
            canonicalUrl: $canonical,
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: null,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: null,
        );
    }

    private function artistDetail(string $slug, Locale $locale): PageSeo
    {
        $translation = ArtistTranslation::query()->where('slug', $slug)->first();
        $artist = $translation
            ? Artist::query()->where('id', $translation->artist_id)->where('is_active', true)
                ->with(['translations', 'representationImage.variants'])->first()
            : null;

        if (! $artist) {
            return $this->notFound($locale);
        }

        $fields = LocalizedFields::resolve($artist->translations, $locale, ['first_name', 'last_name', 'biography']);
        $name = trim(($fields['first_name'] ?? '').' '.($fields['last_name'] ?? ''));
        $override = $artist->seoOverride($locale);

        $ogImageUrl = $override?->ogImage
            ? $this->mediaVariantUrl($override->ogImage->loadMissing('variants'), 'detail')
            : ($artist->representationImage ? $this->mediaVariantUrl($artist->representationImage, 'detail') : null);

        $title = $override?->title ?? $name;
        $description = SeoText::description($override?->description ?? $fields['biography']);
        $canonical = SeoText::segmentsUrl('artists', $slug);

        return new PageSeo(
            title: SeoText::pageTitle($title),
            description: $description,
            canonicalUrl: $canonical,
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: $ogImageUrl,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: [
                '@context' => 'https://schema.org',
                '@graph' => [
                    array_filter([
                        '@type' => 'Person',
                        'name' => $title,
                        'image' => $ogImageUrl,
                        'description' => $description,
                    ]),
                    [
                        '@type' => 'BreadcrumbList',
                        'itemListElement' => [
                            ['@type' => 'ListItem', 'position' => 1, 'name' => SeoLabels::label($locale, 'home'), 'item' => SeoText::absoluteUrl('/')],
                            ['@type' => 'ListItem', 'position' => 2, 'name' => SeoLabels::label($locale, 'artists'), 'item' => SeoText::absoluteUrl('/artists')],
                            ['@type' => 'ListItem', 'position' => 3, 'name' => $title, 'item' => $canonical],
                        ],
                    ],
                ],
            ],
        );
    }

    private function exhibitions(Locale $locale): PageSeo
    {
        $canonical = SeoText::absoluteUrl('/exhibitions');
        $count = Exhibition::query()->where('is_active', true)->count();
        $description = $locale === Locale::En
            ? "View {$count} exhibitions."
            : "{$count} sərgiyə baxın.";

        return new PageSeo(
            title: SeoText::pageTitle(SeoLabels::label($locale, 'exhibitions')),
            description: $description,
            canonicalUrl: $canonical,
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: null,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: null,
        );
    }

    private function exhibitionDetail(string $slug, Locale $locale): PageSeo
    {
        $translation = ExhibitionTranslation::query()->where('slug', $slug)->first();
        $exhibition = $translation
            ? Exhibition::query()->where('id', $translation->exhibition_id)->where('is_active', true)->with('translations')->first()
            : null;

        if (! $exhibition) {
            return $this->notFound($locale);
        }

        $fields = LocalizedFields::resolve($exhibition->translations, $locale, ['title', 'short_text']);
        $override = $exhibition->seoOverride($locale);

        $ogImageUrl = $override?->ogImage ? $this->mediaVariantUrl($override->ogImage->loadMissing('variants'), 'detail') : null;
        $title = $override?->title ?? $fields['title'];
        $description = SeoText::description($override?->description ?? $fields['short_text']);
        $canonical = SeoText::segmentsUrl('exhibitions', $slug);

        return new PageSeo(
            title: SeoText::pageTitle($title),
            description: $description,
            canonicalUrl: $canonical,
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: $ogImageUrl,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: [
                '@context' => 'https://schema.org',
                '@graph' => [
                    [
                        '@type' => 'BreadcrumbList',
                        'itemListElement' => [
                            ['@type' => 'ListItem', 'position' => 1, 'name' => SeoLabels::label($locale, 'home'), 'item' => SeoText::absoluteUrl('/')],
                            ['@type' => 'ListItem', 'position' => 2, 'name' => SeoLabels::label($locale, 'exhibitions'), 'item' => SeoText::absoluteUrl('/exhibitions')],
                            ['@type' => 'ListItem', 'position' => 3, 'name' => $title, 'item' => $canonical],
                        ],
                    ],
                ],
            ],
        );
    }

    private function articles(Locale $locale): PageSeo
    {
        $canonical = SeoText::absoluteUrl('/articles');
        $count = Article::query()
            ->where('status', ArticleStatus::Published)->where('is_active', true)
            ->whereNotNull('published_at')->where('published_at', '<=', now())
            ->count();
        $description = $locale === Locale::En
            ? "Read {$count} journal articles."
            : "{$count} jurnal yazısını oxuyun.";

        return new PageSeo(
            title: SeoText::pageTitle(SeoLabels::label($locale, 'articles')),
            description: $description,
            canonicalUrl: $canonical,
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: null,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: null,
        );
    }

    private function articleDetail(string $slug, Locale $locale): PageSeo
    {
        $translation = ArticleTranslation::query()->where('slug', $slug)->first();
        $article = $translation
            ? Article::query()->where('id', $translation->article_id)
                ->where('status', ArticleStatus::Published)->where('is_active', true)
                ->whereNotNull('published_at')->where('published_at', '<=', now())
                ->with('translations')->first()
            : null;

        if (! $article) {
            return $this->notFound($locale);
        }

        $fields = LocalizedFields::resolve($article->translations, $locale, ['title', 'short_text']);
        $override = $article->seoOverride($locale);

        $ogImageUrl = $override?->ogImage ? $this->mediaVariantUrl($override->ogImage->loadMissing('variants'), 'detail') : null;
        $title = $override?->title ?? $fields['title'];
        $description = SeoText::description($override?->description ?? $fields['short_text']);
        $canonical = SeoText::segmentsUrl('articles', $slug);

        return new PageSeo(
            title: SeoText::pageTitle($title),
            description: $description,
            canonicalUrl: $canonical,
            index: true,
            follow: true,
            ogType: 'article',
            ogImageUrl: $ogImageUrl,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: [
                '@context' => 'https://schema.org',
                '@graph' => [
                    array_filter([
                        '@type' => 'Article',
                        'headline' => $title,
                        'description' => $description,
                        'image' => $ogImageUrl,
                        'datePublished' => $article->published_at?->toIso8601String(),
                    ]),
                    [
                        '@type' => 'BreadcrumbList',
                        'itemListElement' => [
                            ['@type' => 'ListItem', 'position' => 1, 'name' => SeoLabels::label($locale, 'home'), 'item' => SeoText::absoluteUrl('/')],
                            ['@type' => 'ListItem', 'position' => 2, 'name' => SeoLabels::label($locale, 'articles'), 'item' => SeoText::absoluteUrl('/articles')],
                            ['@type' => 'ListItem', 'position' => 3, 'name' => $title, 'item' => $canonical],
                        ],
                    ],
                ],
            ],
        );
    }

    private function notFound(Locale $locale): PageSeo
    {
        return new PageSeo(
            title: SeoText::pageTitle(null),
            description: null,
            canonicalUrl: SeoText::absoluteUrl('/'),
            index: false,
            follow: true,
            ogType: 'website',
            ogImageUrl: null,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: null,
            httpStatus: 404,
        );
    }

    private function firstFeaturedArtworkImageUrl(): ?string
    {
        $artwork = Artwork::query()
            ->where('is_active', true)
            ->where('featured', true)
            ->orderBy('sort_order')
            ->with(['images' => fn ($q) => $q->where('is_main', true), 'images.media.variants'])
            ->first();

        $mainImage = $artwork?->images->first();

        return $mainImage ? $this->mediaVariantUrl($mainImage->media, 'catalogue') : null;
    }

    private function firstArtworkCardImageUrl(): ?string
    {
        $artwork = Artwork::query()
            ->where('is_active', true)
            ->orderBy('sort_order')->orderBy('id')
            ->with(['images' => fn ($q) => $q->where('is_main', true), 'images.media.variants'])
            ->first();

        $mainImage = $artwork?->images->first();

        return $mainImage ? $this->mediaVariantUrl($mainImage->media, 'catalogue') : null;
    }
}
