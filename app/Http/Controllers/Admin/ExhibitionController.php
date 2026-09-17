<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ExhibitionDeletionNotAllowedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreExhibitionRequest;
use App\Http\Requests\Admin\UpdateExhibitionRequest;
use App\Http\Resources\Admin\ExhibitionResource;
use App\Models\Exhibition;
use App\Services\Admin\ExhibitionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExhibitionController extends Controller
{
    public function __construct(private ExhibitionService $exhibitions) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $locale = $request->query('locale', 'az');
        $locales = array_unique([$locale, 'az']);

        $query = Exhibition::query()
            ->with([
                // Unfiltered: the admin AZ/EN editor needs every existing
                // translation regardless of ?locale= (Phase 08 fix pattern).
                'translations',
                'artists.translations' => fn ($q) => $q->whereIn('locale', $locales),
                'artworks.translations' => fn ($q) => $q->whereIn('locale', $locales),
                'media.media.variants',
            ]);

        if ($search = $request->query('search')) {
            $query->whereHas('translations', fn ($t) => $t->where('title', 'like', "%{$search}%"));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = min(100, max(1, $request->integer('per_page', 20)));

        $exhibitions = $query->orderBy('start_date', 'desc')->orderBy('id')->paginate($perPage)->withQueryString();

        return ExhibitionResource::collection($exhibitions);
    }

    public function store(StoreExhibitionRequest $request): ExhibitionResource
    {
        $exhibition = $this->exhibitions->create($request->validated());

        return $this->show($exhibition, $request);
    }

    public function show(Exhibition $exhibition, Request $request): ExhibitionResource
    {
        $exhibition->load([
            'translations', 'artists.translations', 'artworks.translations',
            'media.media.variants',
        ]);

        return new ExhibitionResource($exhibition);
    }

    public function update(UpdateExhibitionRequest $request, Exhibition $exhibition): ExhibitionResource
    {
        $exhibition = $this->exhibitions->update($exhibition, $request->validated());

        return $this->show($exhibition, $request);
    }

    public function destroy(Exhibition $exhibition): JsonResponse
    {
        try {
            $this->exhibitions->delete($exhibition);
        } catch (ExhibitionDeletionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['message' => 'Exhibition archived.']);
    }
}
