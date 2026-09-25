<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\PublicArtworkIndexRequest;
use App\Http\Resources\Api\ArtworkCardResource;
use App\Http\Resources\Api\ArtworkDetailResource;
use App\Models\Artwork;
use App\Support\Api\PaginationParams;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ArtworkController extends Controller
{
    public function index(PublicArtworkIndexRequest $request): AnonymousResourceCollection
    {
        $query = Artwork::query()
            ->where('is_active', true)
            ->with([
                'translations',
                'images' => fn ($q) => $q->orderBy('sort_order'),
                'images.media.variants',
                'artist.translations',
                'genre.translations',
                'medium.translations',
            ]);

        if ($request->filled('artist')) {
            $query->where('artist_id', $request->integer('artist'));
        }

        if ($request->filled('genre')) {
            $query->whereHas('genre', fn ($q) => $q->where('slug', $request->query('genre')));
        }

        if ($request->filled('medium')) {
            $query->whereHas('medium', fn ($q) => $q->where('slug', $request->query('medium')));
        }

        if ($request->filled('status')) {
            $query->where('availability', $request->query('status'));
        }

        if ($request->filled('price_min')) {
            $query->where('price', '>=', $request->float('price_min'));
        }

        if ($request->filled('price_max')) {
            $query->where('price', '<=', $request->float('price_max'));
        }

        // An artwork's size is its larger dimension, GREATEST(width_cm, height_cm), whichever way it is oriented.
        // Written without GREATEST (absent from SQLite): the larger side is >= min if either side is, and <= max
        // only if both are.
        if ($request->filled('size_min')) {
            $min = $request->float('size_min');
            $query->where(fn ($q) => $q->where('width_cm', '>=', $min)->orWhere('height_cm', '>=', $min));
        }

        if ($request->filled('size_max')) {
            $max = $request->float('size_max');
            $query->where('width_cm', '<=', $max)->where('height_cm', '<=', $max);
        }

        match ($request->query('sort')) {
            'newest' => $query->orderBy('created_at', 'desc'),
            'price_asc' => $query->orderBy('price', 'asc'),
            'price_desc' => $query->orderBy('price', 'desc'),
            default => $query->orderBy('sort_order')->orderBy('id'),
        };

        $artworks = $query->paginate(PaginationParams::perPage($request))->withQueryString();

        return ArtworkCardResource::collection($artworks);
    }

    public function show(string $inventoryCode): ArtworkDetailResource
    {
        $artwork = Artwork::query()
            ->where('inventory_code', $inventoryCode)
            ->where('is_active', true)
            ->with([
                'translations', 'artist.translations', 'genre.translations', 'medium.translations',
                'images' => fn ($q) => $q->orderBy('sort_order'), 'images.media.variants',
            ])
            ->first();

        abort_if(! $artwork, 404);

        $similar = Artwork::query()
            ->where('genre_id', $artwork->genre_id)
            ->where('id', '!=', $artwork->id)
            ->where('is_active', true)
            ->with([
                'translations', 'images' => fn ($q) => $q->orderBy('sort_order'), 'images.media.variants',
                'artist.translations', 'genre.translations', 'medium.translations',
            ])
            ->orderBy('sort_order')
            ->limit(4)
            ->get();

        $artwork->setRelation('similar', $similar);

        return new ArtworkDetailResource($artwork);
    }
}
