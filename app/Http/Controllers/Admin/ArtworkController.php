<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ArtworkDeletionNotAllowedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderArtworksRequest;
use App\Http\Requests\Admin\StoreArtworkRequest;
use App\Http\Requests\Admin\UpdateArtworkRequest;
use App\Http\Resources\Admin\ArtworkResource;
use App\Models\Artwork;
use App\Services\Admin\ArtworkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ArtworkController extends Controller
{
    public function __construct(private ArtworkService $artworks) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $locale = $request->query('locale', 'az');
        $locales = array_unique([$locale, 'az']);

        $query = Artwork::query()
            ->with([
                'artist.translations' => fn ($q) => $q->whereIn('locale', $locales),
                'medium.translations' => fn ($q) => $q->whereIn('locale', $locales),
                'genre.translations' => fn ($q) => $q->whereIn('locale', $locales),
                'translations' => fn ($q) => $q->whereIn('locale', $locales),
                'images' => fn ($q) => $q->orderBy('sort_order'),
                'images.media',
            ]);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('inventory_code', 'like', "%{$search}%")
                    ->orWhereHas('translations', fn ($t) => $t->where('title', 'like', "%{$search}%"));
            });
        }

        foreach (['artist_id', 'medium_id', 'genre_id'] as $column) {
            if ($request->filled($column)) {
                $query->where($column, $request->integer($column));
            }
        }

        if ($request->filled('availability')) {
            $query->where('availability', $request->query('availability'));
        }

        foreach (['is_active', 'featured', 'show_on_wall'] as $flag) {
            if ($request->has($flag)) {
                $query->where($flag, $request->boolean($flag));
            }
        }

        $perPage = min(100, max(1, $request->integer('per_page', 20)));

        $artworks = $query->orderBy('sort_order')->orderBy('id')->paginate($perPage)->withQueryString();

        return ArtworkResource::collection($artworks);
    }

    public function store(StoreArtworkRequest $request): ArtworkResource
    {
        $artwork = $this->artworks->create($request->validated());

        return $this->show($artwork, $request);
    }

    public function show(Artwork $artwork, Request $request): ArtworkResource
    {
        $artwork->load([
            'artist.translations', 'medium.translations', 'genre.translations',
            'translations', 'images' => fn ($q) => $q->orderBy('sort_order'), 'images.media',
        ]);

        return new ArtworkResource($artwork);
    }

    public function update(UpdateArtworkRequest $request, Artwork $artwork): ArtworkResource
    {
        $artwork = $this->artworks->update($artwork, $request->validated());

        return $this->show($artwork, $request);
    }

    public function destroy(Artwork $artwork): JsonResponse
    {
        try {
            $this->artworks->delete($artwork);
        } catch (ArtworkDeletionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['message' => 'Artwork archived.']);
    }

    public function reorder(ReorderArtworksRequest $request): JsonResponse
    {
        $this->artworks->reorder($request->validated()['items']);

        return response()->json(['message' => 'Artworks reordered.']);
    }
}
