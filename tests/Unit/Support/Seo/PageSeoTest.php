<?php

namespace Tests\Unit\Support\Seo;

use App\Support\Seo\PageSeo;
use Tests\TestCase;

class PageSeoTest extends TestCase
{
    private function makeSeo(bool $index = true, bool $follow = true): PageSeo
    {
        return new PageSeo(
            title: 'Sunset Over Baku — ArtNiyyətli',
            description: 'An oil painting by Aygün Məmmədova.',
            canonicalUrl: 'http://localhost:8080/artworks/AN-1',
            index: $index,
            follow: $follow,
            ogType: 'website',
            ogImageUrl: 'http://localhost:8080/storage/full.webp',
            ogLocale: 'az_AZ',
            jsonLd: ['@context' => 'https://schema.org', '@type' => 'VisualArtwork'],
        );
    }

    public function test_robots_content_for_index_follow(): void
    {
        $this->assertSame('index, follow', $this->makeSeo(true, true)->robotsContent());
    }

    public function test_robots_content_for_noindex_follow(): void
    {
        $this->assertSame('noindex, follow', $this->makeSeo(false, true)->robotsContent());
    }

    public function test_robots_content_for_index_nofollow(): void
    {
        $this->assertSame('index, nofollow', $this->makeSeo(true, false)->robotsContent());
    }

    public function test_robots_content_for_noindex_nofollow(): void
    {
        $this->assertSame('noindex, nofollow', $this->makeSeo(false, false)->robotsContent());
    }

    public function test_default_http_status_is_200(): void
    {
        $this->assertSame(200, $this->makeSeo()->httpStatus);
    }

    public function test_http_status_can_be_overridden(): void
    {
        $seo = new PageSeo(
            title: 'ArtNiyyətli', description: null, canonicalUrl: 'http://localhost:8080/nope',
            index: false, follow: true, ogType: 'website', ogImageUrl: null, ogLocale: 'az_AZ',
            jsonLd: null, httpStatus: 404,
        );

        $this->assertSame(404, $seo->httpStatus);
    }
}
