<?php

namespace App\Http\Controllers\Admin;

use App\Enums\NavRouteKey;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderNavigationItemsRequest;
use App\Http\Requests\Admin\StoreNavigationItemRequest;
use App\Http\Requests\Admin\UpdateNavigationItemRequest;
use App\Http\Resources\Admin\NavigationItemResource;
use App\Models\NavigationItem;
use App\Models\Page;
use App\Services\Admin\NavigationService;
use Illuminate\Http\JsonResponse;

class NavigationController extends Controller
{
    public function __construct(private NavigationService $navigation) {}

    public function index(): JsonResponse
    {
        $items = NavigationItem::query()
            ->with('page.translations')
            ->orderBy('placement')
            ->orderBy('sort_order')
            ->get()
            ->groupBy(fn (NavigationItem $item) => $item->placement->value);

        $availablePages = Page::query()
            ->where('is_active', true)
            ->with('translations')
            ->orderBy('id')
            ->get()
            ->map(function (Page $page) {
                $translation = $page->translations->firstWhere('locale', 'az') ?? $page->translations->first();

                return ['id' => $page->id, 'title' => $translation?->title, 'slug' => $translation?->slug];
            })
            ->values();

        return response()->json([
            'data' => [
                'header' => NavigationItemResource::collection($items->get('header', collect())),
                'footer' => NavigationItemResource::collection($items->get('footer', collect())),
            ],
            'meta' => [
                'available_pages' => $availablePages,
                'available_routes' => array_map(fn (NavRouteKey $key) => $key->value, NavRouteKey::cases()),
            ],
        ]);
    }

    public function store(StoreNavigationItemRequest $request): NavigationItemResource
    {
        $item = $this->navigation->create($request->validated());
        $item->load('page.translations');

        return new NavigationItemResource($item);
    }

    public function update(UpdateNavigationItemRequest $request, NavigationItem $navigation): NavigationItemResource
    {
        $item = $this->navigation->update($navigation, $request->validated());
        $item->load('page.translations');

        return new NavigationItemResource($item);
    }

    public function destroy(NavigationItem $navigation): JsonResponse
    {
        $this->navigation->delete($navigation);

        return response()->json(['message' => 'Navigation item removed.']);
    }

    public function reorder(ReorderNavigationItemsRequest $request): JsonResponse
    {
        $this->navigation->reorder($request->validated()['items']);

        return response()->json(['message' => 'Navigation reordered.']);
    }
}
