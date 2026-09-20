<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\NavType;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\NavigationItemResource;
use App\Models\NavigationItem;
use App\Support\Api\LocaleResolver;
use App\Support\Cache\PublicContentCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NavigationController extends Controller
{
    public function __construct(private PublicContentCache $cache) {}

    public function index(Request $request): JsonResponse
    {
        // The only input that changes the payload is the locale, normalised to az/en before it becomes part of the key.
        $locale = LocaleResolver::resolve($request);

        $body = $this->cache->remember(
            "navigation:{$locale->value}",
            (int) config('public_cache.ttl.navigation'),
            fn () => response()->json($this->payload($request))->getContent(),
        );

        return JsonResponse::fromJsonString($body);
    }

    private function payload(Request $request): array
    {
        $items = NavigationItem::query()
            ->where('is_visible', true)
            ->where(function ($query) {
                $query->where('nav_type', NavType::Route->value)
                    ->orWhereHas('page', fn ($q) => $q->where('is_active', true));
            })
            ->with('page.translations')
            ->orderBy('placement')
            ->orderBy('sort_order')
            ->get()
            ->groupBy(fn (NavigationItem $item) => $item->placement->value);

        return [
            'data' => [
                'header' => NavigationItemResource::collection($items->get('header', collect()))->resolve($request),
                'footer' => NavigationItemResource::collection($items->get('footer', collect()))->resolve($request),
            ],
        ];
    }
}
