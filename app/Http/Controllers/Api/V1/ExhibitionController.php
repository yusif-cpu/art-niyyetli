<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ExhibitionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\PublicExhibitionIndexRequest;
use App\Http\Resources\Api\ExhibitionResource;
use App\Models\Exhibition;
use App\Models\ExhibitionTranslation;
use App\Support\Api\PaginationParams;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExhibitionController extends Controller
{
    public function index(PublicExhibitionIndexRequest $request): AnonymousResourceCollection
    {
        $query = Exhibition::query()
            ->where('is_active', true)
            ->with([
                'translations', 'artists.translations',
                'artworks' => fn ($q) => $q->where('is_active', true),
                'artworks.translations',
                'artworks.images' => fn ($q) => $q->orderBy('sort_order'),
                'artworks.images.media.variants',
                'artworks.artist.translations', 'artworks.genre.translations', 'artworks.medium.translations',
                'media.media.variants',
            ]);

        if ($filter = $request->query('filter')) {
            $status = $filter === 'archive' ? ExhibitionStatus::Past : ExhibitionStatus::from($filter);
            $query->where('status', $status);
        }

        $exhibitions = $query->orderBy('start_date', 'desc')->paginate(PaginationParams::perPage($request))->withQueryString();

        return ExhibitionResource::collection($exhibitions);
    }

    public function show(string $slug): ExhibitionResource
    {
        $translation = ExhibitionTranslation::query()->where('slug', $slug)->first();
        abort_if(! $translation, 404);

        $exhibition = Exhibition::query()
            ->where('id', $translation->exhibition_id)
            ->where('is_active', true)
            ->with([
                'translations', 'artists.translations',
                'artworks' => fn ($q) => $q->where('is_active', true),
                'artworks.translations',
                'artworks.images' => fn ($q) => $q->orderBy('sort_order'),
                'artworks.images.media.variants',
                'artworks.artist.translations', 'artworks.genre.translations', 'artworks.medium.translations',
                'media.media.variants',
                'seoMetadata.ogImage.variants',
            ])
            ->first();

        abort_if(! $exhibition, 404);

        return new ExhibitionResource($exhibition);
    }
}
