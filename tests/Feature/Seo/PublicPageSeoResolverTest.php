<?php

namespace Tests\Feature\Seo;

use App\Enums\Locale;
use App\Enums\PageType;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Page;
use App\Services\Seo\PublicPageSeoResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicPageSeoResolverTest extends TestCase
{
    use RefreshDatabase;

    private function resolver(): PublicPageSeoResolver
    {
        return app(PublicPageSeoResolver::class);
    }

    public function test_home_uses_the_active_home_pages_hero_section(): void
    {
        $home = Page::create(['type' => PageType::Home, 'is_active' => true]);
        $home->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'X']);
        $home->sections()->create(['key' => 'hero', 'sort_order' => 0, 'is_active' => true])
            ->translations()->create(['locale' => 'az', 'heading' => 'ArtNiyyətli', 'body' => 'Müasir Azərbaycan sənətini kəşf edin.']);

        $seo = $this->resolver()->resolve([], Locale::Az);

        $this->assertSame('ArtNiyyətli', $seo->title);
        $this->assertSame('Müasir Azərbaycan sənətini kəşf edin.', $seo->description);
        $this->assertSame('http://localhost:8080/', $seo->canonicalUrl);
        $this->assertTrue($seo->index);
        $this->assertTrue($seo->follow);
        $this->assertSame(200, $seo->httpStatus);
        $this->assertNotNull($seo->jsonLd);
        $this->assertSame('https://schema.org', $seo->jsonLd['@context']);
    }

    public function test_home_falls_back_to_the_bare_site_name_when_no_active_home_page_exists(): void
    {
        $seo = $this->resolver()->resolve([], Locale::Az);

        $this->assertSame('ArtNiyyətli', $seo->title);
        $this->assertNull($seo->description);
        $this->assertTrue($seo->index);
    }

    public function test_static_page_resolves_an_active_page_by_slug(): void
    {
        $page = Page::create(['type' => PageType::About, 'is_active' => true]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'about', 'title' => 'Haqqımızda', 'content' => 'Qalereya haqqında məlumat.']);

        $seo = $this->resolver()->resolve(['about'], Locale::Az);

        $this->assertSame('Haqqımızda — ArtNiyyətli', $seo->title);
        $this->assertSame('Qalereya haqqında məlumat.', $seo->description);
        $this->assertSame('http://localhost:8080/about', $seo->canonicalUrl);
        $this->assertTrue($seo->index);
        $this->assertSame(200, $seo->httpStatus);
        $this->assertNull($seo->jsonLd);
    }

    public function test_static_page_is_not_found_for_an_unresolvable_slug(): void
    {
        $seo = $this->resolver()->resolve(['nonexistent'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertFalse($seo->index);
        $this->assertTrue($seo->follow);
    }

    public function test_static_page_is_not_found_for_an_inactive_page(): void
    {
        $page = Page::create(['type' => PageType::Custom, 'is_active' => false]);
        $page->translations()->create(['locale' => 'az', 'slug' => 'hidden', 'title' => 'Hidden', 'content' => 'X']);

        $seo = $this->resolver()->resolve(['hidden'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertFalse($seo->index);
    }

    public function test_multi_segment_unmatched_path_is_not_found(): void
    {
        $seo = $this->resolver()->resolve(['a', 'b', 'c'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertFalse($seo->index);
        $this->assertTrue($seo->follow);
    }

    public function test_not_found_reports_the_requested_locale_in_og_locale(): void
    {
        $seo = $this->resolver()->resolve(['nonexistent'], Locale::En);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertSame('en_US', $seo->ogLocale);
    }

    private function makeArtwork(string $inventoryCode, array $overrides = []): Artwork
    {
        $artwork = Artwork::create(array_merge([
            'artist_id' => Artist::create([])->id,
            'medium_id' => Medium::firstOrCreate(['slug' => 'oil-on-canvas'])->id,
            'genre_id' => Genre::firstOrCreate(['slug' => 'abstraction'])->id,
            'year_created' => 2023, 'width_cm' => 80, 'height_cm' => 100,
            'price' => 5000, 'show_price' => true, 'inventory_code' => $inventoryCode, 'is_active' => true,
        ], $overrides));

        $artwork->translations()->create(['locale' => 'az', 'slug' => $inventoryCode, 'title' => 'Sunset Over Baku', 'short_description' => 'An oil painting of the Baku skyline at dusk.', 'provenance' => 'Acquired directly from the artist.']);
        $artwork->artist->translations()->create(['locale' => 'az', 'slug' => 'artist-'.$artwork->artist_id, 'first_name' => 'Aygün', 'last_name' => 'Məmmədova']);

        return $artwork;
    }

    public function test_catalogue_uses_a_live_artwork_count_and_is_indexable(): void
    {
        $this->makeArtwork('AN-CAT-1');
        $this->makeArtwork('AN-CAT-2');

        $seo = $this->resolver()->resolve(['artworks'], Locale::Az);

        $this->assertSame('Əsərlər — ArtNiyyətli', $seo->title);
        $this->assertSame('2 əsərdən ibarət kataloqu kəşf edin.', $seo->description);
        $this->assertSame('http://localhost:8080/artworks', $seo->canonicalUrl);
        $this->assertTrue($seo->index);
        $this->assertNull($seo->jsonLd);
    }

    public function test_artwork_detail_resolves_title_description_and_json_ld(): void
    {
        $this->makeArtwork('AN-DETAIL-1');

        $seo = $this->resolver()->resolve(['artworks', 'AN-DETAIL-1'], Locale::Az);

        $this->assertSame('Sunset Over Baku — ArtNiyyətli', $seo->title);
        $this->assertSame('An oil painting of the Baku skyline at dusk.', $seo->description);
        $this->assertSame('http://localhost:8080/artworks/AN-DETAIL-1', $seo->canonicalUrl);
        $this->assertTrue($seo->index);
        $this->assertTrue($seo->follow);
        $this->assertSame(200, $seo->httpStatus);
        $this->assertSame('VisualArtwork', $seo->jsonLd['@graph'][0]['@type']);
        $this->assertSame('Aygün Məmmədova', $seo->jsonLd['@graph'][0]['creator']['name']);
        $this->assertSame('BreadcrumbList', $seo->jsonLd['@graph'][1]['@type']);
    }

    public function test_artwork_detail_stays_indexable_when_sold(): void
    {
        $this->makeArtwork('AN-SOLD-1', ['availability' => 'sold']);

        $seo = $this->resolver()->resolve(['artworks', 'AN-SOLD-1'], Locale::Az);

        $this->assertTrue($seo->index);
    }

    public function test_artwork_detail_is_not_found_for_an_unknown_code(): void
    {
        $seo = $this->resolver()->resolve(['artworks', 'does-not-exist'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertFalse($seo->index);
    }

    public function test_artwork_detail_is_not_found_for_an_inactive_artwork(): void
    {
        $this->makeArtwork('AN-INACTIVE-1', ['is_active' => false]);

        $seo = $this->resolver()->resolve(['artworks', 'AN-INACTIVE-1'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
    }

    public function test_artwork_detail_omits_description_when_short_description_is_empty(): void
    {
        $artwork = Artwork::create([
            'artist_id' => Artist::create([])->id,
            'medium_id' => Medium::firstOrCreate(['slug' => 'ink'])->id,
            'genre_id' => Genre::firstOrCreate(['slug' => 'sketch'])->id,
            'year_created' => 2023, 'width_cm' => 20, 'height_cm' => 20,
            'price' => 300, 'inventory_code' => 'AN-NODESC-1', 'is_active' => true,
        ]);
        $artwork->translations()->create(['locale' => 'az', 'slug' => 'x', 'title' => 'Untitled Sketch', 'short_description' => '', 'provenance' => 'Studio collection.']);

        $seo = $this->resolver()->resolve(['artworks', 'AN-NODESC-1'], Locale::Az);

        $this->assertNull($seo->description);
    }

    private function makeArtist(string $slug, array $overrides = []): Artist
    {
        $artist = Artist::create(array_merge(['is_active' => true], $overrides));
        $artist->translations()->create([
            'locale' => 'az', 'slug' => $slug, 'first_name' => 'Aygün', 'last_name' => 'Məmmədova',
            'biography' => 'Aygün Məmmədova müasir Azərbaycan rəssamıdır.',
        ]);

        return $artist;
    }

    public function test_artists_list_uses_a_live_count(): void
    {
        $this->makeArtist('artist-1');
        $this->makeArtist('artist-2');

        $seo = $this->resolver()->resolve(['artists'], Locale::Az);

        $this->assertSame('Rəssamlar — ArtNiyyətli', $seo->title);
        $this->assertSame('2 rəssamla tanış olun.', $seo->description);
        $this->assertSame('http://localhost:8080/artists', $seo->canonicalUrl);
        $this->assertTrue($seo->index);
    }

    public function test_artist_detail_resolves_name_biography_and_json_ld(): void
    {
        $this->makeArtist('aygun-mammadova');

        $seo = $this->resolver()->resolve(['artists', 'aygun-mammadova'], Locale::Az);

        $this->assertSame('Aygün Məmmədova — ArtNiyyətli', $seo->title);
        $this->assertSame('Aygün Məmmədova müasir Azərbaycan rəssamıdır.', $seo->description);
        $this->assertSame('http://localhost:8080/artists/aygun-mammadova', $seo->canonicalUrl);
        $this->assertTrue($seo->index);
        $this->assertSame('Person', $seo->jsonLd['@graph'][0]['@type']);
        $this->assertSame('Aygün Məmmədova', $seo->jsonLd['@graph'][0]['name']);
        $this->assertSame('BreadcrumbList', $seo->jsonLd['@graph'][1]['@type']);
    }

    public function test_artist_detail_is_not_found_for_an_unknown_slug(): void
    {
        $seo = $this->resolver()->resolve(['artists', 'nobody'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
        $this->assertFalse($seo->index);
    }

    public function test_artist_detail_is_not_found_for_an_inactive_artist(): void
    {
        $this->makeArtist('inactive-artist', ['is_active' => false]);

        $seo = $this->resolver()->resolve(['artists', 'inactive-artist'], Locale::Az);

        $this->assertSame(404, $seo->httpStatus);
    }
}
