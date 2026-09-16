<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ExhibitionStatus;
use App\Enums\PageType;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\ArtistResource;
use App\Http\Resources\Api\ArtworkCardResource;
use App\Http\Resources\Api\ExhibitionResource;
use App\Http\Resources\Api\FaqResource;
use App\Http\Resources\Api\PageSectionResource;
use App\Http\Resources\Api\SocialLinkResource;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Faq;
use App\Models\Page;
use App\Models\SocialLink;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomepageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $locale = LocaleResolver::resolve($request);

        $homePage = Page::query()
            ->where('type', PageType::Home)
            ->where('is_active', true)
            ->with([
                'translations',
                'sections' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'sections.translations', 'sections.image.variants',
            ])
            ->first();

        $artworkWith = [
            'translations', 'images' => fn ($q) => $q->orderBy('sort_order'), 'images.media.variants',
            'artist.translations', 'genre.translations', 'medium.translations',
        ];

        $wall = Artwork::query()->where('is_active', true)->where('show_on_wall', true)
            ->with($artworkWith)->orderBy('sort_order')->get();

        $featured = Artwork::query()->where('is_active', true)->where('featured', true)
            ->with($artworkWith)->orderBy('sort_order')->limit(6)->get();

        $artists = Artist::query()->where('is_active', true)
            ->with(['translations', 'representationImage.variants'])
            ->orderBy('sort_order')->orderBy('id')->get();

        $exhibitionWith = [
            'translations', 'artists.translations',
            'artworks' => fn ($q) => $q->where('is_active', true),
            'artworks.translations',
            'artworks.images' => fn ($q) => $q->orderBy('sort_order'), 'artworks.images.media.variants',
            'artworks.artist.translations', 'artworks.genre.translations', 'artworks.medium.translations',
            'media.media.variants',
        ];

        $exhibition = Exhibition::query()->where('is_active', true)->where('status', ExhibitionStatus::Current)
            ->with($exhibitionWith)->orderBy('start_date')->first()
            ?? Exhibition::query()->where('is_active', true)->where('status', ExhibitionStatus::Upcoming)
                ->with($exhibitionWith)->orderBy('start_date')->first();

        $faqs = $homePage
            ? Faq::query()->where('page_id', $homePage->id)->where('is_active', true)->with('translations')->orderBy('sort_order')->get()
            : collect();

        $socialLinks = SocialLink::query()->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['data' => [
            'page' => $homePage ? [
                'title' => LocalizedFields::resolve($homePage->translations, $locale, ['title'])['title'],
                'sections' => PageSectionResource::collection($homePage->sections)->resolve($request),
            ] : null,
            'stats' => [
                'artists' => Artist::query()->where('is_active', true)->count(),
                'artworks' => Artwork::query()->where('is_active', true)->count(),
                'exhibitions' => Exhibition::query()->where('is_active', true)->count(),
            ],
            'wall' => ArtworkCardResource::collection($wall)->resolve($request),
            'featured' => ArtworkCardResource::collection($featured)->resolve($request),
            'artists' => ArtistResource::collection($artists)->resolve($request),
            'exhibition' => $exhibition ? (new ExhibitionResource($exhibition))->resolve($request) : null,
            'faqs' => FaqResource::collection($faqs)->resolve($request),
            'social_links' => SocialLinkResource::collection($socialLinks)->resolve($request),
        ]]);
    }
}
