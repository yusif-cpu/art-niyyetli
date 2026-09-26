<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\CatalogTermInUseException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGenreRequest;
use App\Http\Requests\Admin\UpdateGenreRequest;
use App\Http\Resources\Admin\GenreResource;
use App\Models\Genre;
use App\Services\Admin\GenreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GenreController extends Controller
{
    public function __construct(private GenreService $genres) {}

    public function index(): AnonymousResourceCollection
    {
        $items = Genre::query()->with('translations')->orderBy('sort_order')->orderBy('id')->get();

        return GenreResource::collection($items);
    }

    public function store(StoreGenreRequest $request): GenreResource
    {
        $genre = $this->genres->create($request->validated());

        return $this->show($genre);
    }

    public function show(Genre $genre): GenreResource
    {
        $genre->load('translations');

        return new GenreResource($genre);
    }

    public function update(UpdateGenreRequest $request, Genre $genre): GenreResource
    {
        $genre = $this->genres->update($genre, $request->validated());

        return $this->show($genre);
    }

    public function destroy(Genre $genre): JsonResponse
    {
        try {
            $this->genres->delete($genre);
        } catch (CatalogTermInUseException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['message' => 'Genre deleted.']);
    }
}
