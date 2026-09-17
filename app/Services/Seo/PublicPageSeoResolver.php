<?php

namespace App\Services\Seo;

use App\Enums\Locale;
use App\Enums\PageType;
use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Models\Artwork;
use App\Models\Page;
use App\Models\PageTranslation;
use App\Services\Admin\SiteSettingService;
use App\Support\Api\LocalizedFields;
use App\Support\Seo\PageSeo;
use App\Support\Seo\SeoText;

class PublicPageSeoResolver
{
    use ResolvesMediaUrl;

    public function __construct(private SiteSettingService $siteSettings) {}

    public function resolve(array $segments, Locale $locale): PageSeo
    {
        return match (true) {
            $segments === [] => $this->home($locale),
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
            canonicalUrl: SeoText::absoluteUrl("/{$slug}"),
            index: true,
            follow: true,
            ogType: 'website',
            ogImageUrl: null,
            ogLocale: SeoText::ogLocale($locale),
            jsonLd: null,
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
}
