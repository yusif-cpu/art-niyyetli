<?php

namespace Tests\Feature\Seo;

use App\Enums\PageType;
use App\Models\Article;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Media;
use App\Models\MediaVariant;
use App\Models\Page;
use Illuminate\Database\Eloquent\Model;

/**
 * Builds one active, public record of each of the five SEO-able content types.
 */
trait CreatesSeoSubjects
{
    /** @return array<string, array{0: string}> */
    public static function seoKinds(): array
    {
        return ['page' => ['page'], 'artwork' => ['artwork'], 'artist' => ['artist'], 'exhibition' => ['exhibition'], 'article' => ['article']];
    }

    private function makeSeoSubject(string $kind): Model
    {
        return match ($kind) {
            'page' => tap(Page::factory()->create(['type' => PageType::Custom->value]), function (Page $page) {
                $page->translations()->create(['locale' => 'az', 'slug' => 'haqqimizda', 'title' => 'Haqqımızda', 'content' => 'Mətn']);
                $page->translations()->create(['locale' => 'en', 'slug' => 'about-us', 'title' => 'About us', 'content' => 'Text']);
            }),
            'artwork' => tap(Artwork::factory()->create(['is_active' => true, 'inventory_code' => 'AN-SEO-1']), function (Artwork $artwork) {
                $artwork->translations()->create(['locale' => 'az', 'slug' => 'eser', 'title' => 'Əsər', 'short_description' => 'Qısa', 'provenance' => 'P']);
            }),
            'artist' => tap(Artist::factory()->create(), function (Artist $artist) {
                $artist->translations()->create(['locale' => 'az', 'slug' => 'aygun', 'first_name' => 'Aygün', 'last_name' => 'Məmmədova']);
                $artist->translations()->create(['locale' => 'en', 'slug' => 'aygun-en', 'first_name' => 'Aygun', 'last_name' => 'Mammadova']);
            }),
            'exhibition' => tap(Exhibition::factory()->create(), function (Exhibition $exhibition) {
                $exhibition->translations()->create(['locale' => 'az', 'slug' => 'serge', 'title' => 'Sərgi', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);
            }),
            'article' => tap(Article::factory()->create(['status' => 'published', 'is_active' => true, 'published_at' => now()->subDay()]), function (Article $article) {
                $article->translations()->create(['locale' => 'az', 'slug' => 'meqale', 'title' => 'Məqalə', 'short_text' => 'S', 'content' => 'C']);
            }),
        };
    }

    private function publicSeoUrl(string $kind, Model $subject): string
    {
        return '/api/v1/'.match ($kind) {
            'page' => 'pages/haqqimizda',
            'artwork' => 'artworks/AN-SEO-1',
            'artist' => 'artists/aygun',
            'exhibition' => 'exhibitions/serge',
            'article' => 'articles/meqale',
        };
    }

    private function adminSeoPath(string $kind, Model $subject): string
    {
        return '/admin/'.match ($kind) {
            'page' => 'pages',
            'artwork' => 'artworks',
            'artist' => 'artists',
            'exhibition' => 'exhibitions',
            'article' => 'articles',
        }.'/'.$subject->id;
    }

    private function makeSeoImage(string $path = 'seo/og.webp'): Media
    {
        $media = Media::factory()->create();
        MediaVariant::create([
            'media_id' => $media->id, 'variant' => 'detail-webp', 'disk' => 'public', 'path' => $path,
            'mime_type' => 'image/webp', 'size_bytes' => 100, 'width' => 100, 'height' => 100,
        ]);

        return $media;
    }
}
