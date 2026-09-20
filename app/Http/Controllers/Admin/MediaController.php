<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\MediaDeletionNotAllowedException;
use App\Exceptions\MediaProcessingFailedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreMediaRequest;
use App\Http\Requests\Admin\UpdateMediaRequest;
use App\Http\Resources\Admin\MediaResource;
use App\Models\Media;
use App\Services\Admin\MediaService;
use App\Support\Api\QueryParams;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MediaController extends Controller
{
    public function __construct(private MediaService $media) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Media::query()->with(['translations', 'variants']);

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($search = QueryParams::search($request)) {
            QueryParams::whereLike($query, 'original_filename', $search);
        }

        if ($artworkId = $request->query('artwork_id')) {
            $query->whereHas('artworkImages', fn ($q) => $q->where('artwork_id', $artworkId));
        }

        $perPage = min(100, max(1, $request->integer('per_page', 20)));

        return MediaResource::collection(
            $query->latest()->paginate($perPage)->withQueryString()
        );
    }

    public function store(StoreMediaRequest $request): MediaResource|JsonResponse
    {
        try {
            $media = $this->media->upload($request->file('file'), $request->input('alt_text', []));
        } catch (MediaProcessingFailedException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return new MediaResource($media);
    }

    public function show(Media $media): MediaResource
    {
        return new MediaResource($media->load(['translations', 'variants']));
    }

    public function update(UpdateMediaRequest $request, Media $media): MediaResource
    {
        $media = $this->media->updateAltText($media, $request->validated()['alt_text']);

        return new MediaResource($media);
    }

    public function destroy(Media $media): JsonResponse
    {
        try {
            $this->media->delete($media);
        } catch (MediaDeletionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['message' => 'Media archived.']);
    }
}
