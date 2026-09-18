<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\NavType;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\NavigationItemResource;
use App\Models\NavigationItem;
use Illuminate\Http\JsonResponse;

class NavigationController extends Controller
{
    public function index(): JsonResponse
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

        return response()->json([
            'data' => [
                'header' => NavigationItemResource::collection($items->get('header', collect())),
                'footer' => NavigationItemResource::collection($items->get('footer', collect())),
            ],
        ]);
    }
}
