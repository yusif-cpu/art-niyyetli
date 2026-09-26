<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ExhibitionStatus;
use App\Enums\Locale;
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
use App\Support\Cache\PublicContentCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomepageController extends Controller
{
    public function __construct(private PublicContentCache $cache) {}

    public function index(Request $request): JsonResponse
    {
        // The only input that changes the payload is the locale, normalised to az/en before it becomes part of the key.
        $locale = LocaleResolver::resolve($request);

        $body = $this->cache->remember(
            "homepage:{$locale->value}",
            (int) config('public_cache.ttl.homepage'),
            fn () => response()->json($this->payload($request, $locale))->getContent(),
        );

        return JsonResponse::fromJsonString($body);
    }

    private function payload(Request $request, Locale $locale): array
    {
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
            ->with($artworkWith)->orderBy('sort_order')
            ->limit((int) config('gallery.wall_limit', 16))->get();

        $featured = Artwork::query()->where('is_active', true)->where('featured', true)
            ->with($artworkWith)->orderBy('sort_order')->limit(6)->get();

        $artists = Artist::query()->where('is_active', true)->withUsableAzTranslation()
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

        // Current and upcoming exhibitions, each soonest start first (the same ordering `exhibition` always used) and
        // capped so the payload stays bounded. Past exhibitions are never part of the homepage.
        // The ids are picked first (a cheap query per status) so the heavy eager loads run once for both lists.
        $limit = (int) config('gallery.homepage_exhibitions_limit', 3);
        $idsWithStatus = fn (ExhibitionStatus $status) => Exhibition::query()
            ->where('is_active', true)->where('status', $status)
            ->orderBy('start_date')->orderBy('id')->limit($limit)->pluck('id');

        $currentIds = $idsWithStatus(ExhibitionStatus::Current);
        $upcomingIds = $idsWithStatus(ExhibitionStatus::Upcoming);
        $loaded = Exhibition::query()->whereIn('id', $currentIds->merge($upcomingIds))->with($exhibitionWith)->get()->keyBy('id');

        $currentExhibitions = $currentIds->map(fn ($id) => $loaded[$id]);
        $upcomingExhibitions = $upcomingIds->map(fn ($id) => $loaded[$id]);

        // Kept for existing clients: the earliest current exhibition, else the earliest upcoming one.
        $exhibition = $currentExhibitions->first() ?? $upcomingExhibitions->first();

        $faqs = $homePage
            ? Faq::query()->where('page_id', $homePage->id)->where('is_active', true)->with('translations')->orderBy('sort_order')->get()
            : collect();

        $socialLinks = SocialLink::query()->with('logoMedia.variants')
            ->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get();

        return ['data' => [
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
            'exhibitions' => [
                'current' => ExhibitionResource::collection($currentExhibitions)->resolve($request),
                'upcoming' => ExhibitionResource::collection($upcomingExhibitions)->resolve($request),
            ],
            'exhibition' => $exhibition ? (new ExhibitionResource($exhibition))->resolve($request) : null,
            'faqs' => FaqResource::collection($faqs)->resolve($request),
            'social_links' => SocialLinkResource::collection($socialLinks)->resolve($request),
        ]];
    }
}
