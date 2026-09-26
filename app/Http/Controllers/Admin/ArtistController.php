<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ArtistDeletionNotAllowedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreArtistRequest;
use App\Http\Requests\Admin\UpdateArtistRequest;
use App\Http\Resources\Admin\ArtistResource;
use App\Models\Artist;
use App\Services\Admin\ArtistService;
use App\Support\Api\QueryParams;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ArtistController extends Controller
{
    public function __construct(private ArtistService $artists) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $locale = $request->query('locale', 'az');
        $locales = array_unique([$locale, 'az']);

        $query = Artist::query()
            ->with([
                'translations' => fn ($q) => $q->whereIn('locale', $locales),
                'representationImage.variants',
            ]);

        if ($search = QueryParams::search($request)) {
            $query->whereHas('translations', function ($t) use ($search) {
                QueryParams::whereLike($t, 'first_name', $search);
                QueryParams::whereLike($t, 'last_name', $search, 'or');
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = min(100, max(1, $request->integer('per_page', 20)));

        $artists = $query->orderBy('sort_order')->orderBy('id')->paginate($perPage)->withQueryString();

        return ArtistResource::collection($artists);
    }

    public function store(StoreArtistRequest $request): ArtistResource
    {
        $artist = $this->artists->create($request->validated());

        return $this->show($artist, $request);
    }

    public function show(Artist $artist, Request $request): ArtistResource
    {
        $artist->load(['translations', 'representationImage.variants', 'exhibitions.translations', 'awards.translations', 'seoMetadata.ogImage.variants']);

        return new ArtistResource($artist);
    }

    public function update(UpdateArtistRequest $request, Artist $artist): ArtistResource
    {
        $artist = $this->artists->update($artist, $request->validated());

        return $this->show($artist, $request);
    }

    public function destroy(Artist $artist): JsonResponse
    {
        try {
            $this->artists->delete($artist);
        } catch (ArtistDeletionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['message' => 'Artist archived.']);
    }
}
