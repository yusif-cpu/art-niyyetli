<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\PageResource;
use App\Models\Page;
use App\Models\PageTranslation;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PageController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $pages = Page::query()
            ->where('is_active', true)
            ->with('translations')
            ->orderBy('id')
            ->get();

        return PageResource::collection($pages);
    }

    public function show(string $slug): PageResource
    {
        $translation = PageTranslation::query()->where('slug', $slug)->first();
        abort_if(! $translation, 404);

        $page = Page::query()
            ->where('id', $translation->page_id)
            ->where('is_active', true)
            ->with([
                'translations',
                'sections' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'sections.translations',
                'sections.image.variants',
                'seoMetadata.ogImage.variants',
            ])
            ->first();

        abort_if(! $page, 404);

        return new PageResource($page);
    }
}
