<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\ArtistResource;
use App\Models\Artist;
use App\Models\ArtistTranslation;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ArtistController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $artists = Artist::query()
            ->where('is_active', true)
            ->withUsableAzTranslation()
            ->with(['translations', 'representationImage.variants'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return ArtistResource::collection($artists);
    }

    public function show(string $slug): ArtistResource
    {
        $translation = ArtistTranslation::query()->where('slug', $slug)->first();
        abort_if(! $translation, 404);

        $artist = Artist::query()
            ->where('id', $translation->artist_id)
            ->where('is_active', true)
            ->with([
                'translations', 'representationImage.variants',
                'exhibitions.translations', 'awards.translations',
                'artworks' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'artworks.translations', 'artworks.medium.translations', 'artworks.genre.translations',
                'artworks.images' => fn ($q) => $q->orderBy('sort_order'), 'artworks.images.media.variants',
            ])
            ->first();

        abort_if(! $artist, 404);

        return new ArtistResource($artist);
    }
}
