<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderSocialLinksRequest;
use App\Http\Requests\Admin\StoreSocialLinkRequest;
use App\Http\Requests\Admin\UpdateSocialLinkRequest;
use App\Http\Resources\Admin\SocialLinkResource;
use App\Models\SocialLink;
use App\Services\Admin\SocialLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SocialLinkController extends Controller
{
    public function __construct(private SocialLinkService $socialLinks) {}

    public function index(): AnonymousResourceCollection
    {
        $links = SocialLink::query()
            ->with(SocialLinkService::LOGO_RELATIONS)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return SocialLinkResource::collection($links);
    }

    public function store(StoreSocialLinkRequest $request): SocialLinkResource
    {
        $link = $this->socialLinks->create($request->validated());

        return new SocialLinkResource($link);
    }

    public function show(SocialLink $socialLink): SocialLinkResource
    {
        return new SocialLinkResource($socialLink->load(SocialLinkService::LOGO_RELATIONS));
    }

    public function update(UpdateSocialLinkRequest $request, SocialLink $socialLink): SocialLinkResource
    {
        $link = $this->socialLinks->update($socialLink, $request->validated());

        return new SocialLinkResource($link);
    }

    public function destroy(SocialLink $socialLink): JsonResponse
    {
        $this->socialLinks->delete($socialLink);

        return response()->json(['message' => 'Social link deleted.']);
    }

    public function reorder(ReorderSocialLinksRequest $request): JsonResponse
    {
        $this->socialLinks->reorder($request->validated()['items']);

        return response()->json(['message' => 'Social links reordered.']);
    }
}
