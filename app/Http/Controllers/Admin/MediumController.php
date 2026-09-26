<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\CatalogTermInUseException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreMediumRequest;
use App\Http\Requests\Admin\UpdateMediumRequest;
use App\Http\Resources\Admin\MediumResource;
use App\Models\Medium;
use App\Services\Admin\MediumService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MediumController extends Controller
{
    public function __construct(private MediumService $mediums) {}

    public function index(): AnonymousResourceCollection
    {
        $items = Medium::query()->with('translations')->orderBy('sort_order')->orderBy('id')->get();

        return MediumResource::collection($items);
    }

    public function store(StoreMediumRequest $request): MediumResource
    {
        $medium = $this->mediums->create($request->validated());

        return $this->show($medium);
    }

    public function show(Medium $medium): MediumResource
    {
        $medium->load('translations');

        return new MediumResource($medium);
    }

    public function update(UpdateMediumRequest $request, Medium $medium): MediumResource
    {
        $medium = $this->mediums->update($medium, $request->validated());

        return $this->show($medium);
    }

    public function destroy(Medium $medium): JsonResponse
    {
        try {
            $this->mediums->delete($medium);
        } catch (CatalogTermInUseException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['message' => 'Medium deleted.']);
    }
}
