<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderPagesRequest;
use App\Http\Requests\Admin\StorePageRequest;
use App\Http\Requests\Admin\UpdatePageRequest;
use App\Http\Resources\Admin\PageResource;
use App\Models\Page;
use App\Services\Admin\PageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PageController extends Controller
{
    public function __construct(private PageService $pages) {}

    public function index(): AnonymousResourceCollection
    {
        $pages = Page::query()
            ->with([
                'translations',
                'sections' => fn ($q) => $q->orderBy('sort_order'),
                'sections.translations',
                'sections.image.variants',
            ])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return PageResource::collection($pages);
    }

    public function reorder(ReorderPagesRequest $request): JsonResponse
    {
        $this->pages->reorder($request->validated()['items']);

        return response()->json(['message' => 'Pages reordered.']);
    }

    public function store(StorePageRequest $request): PageResource
    {
        $page = $this->pages->create($request->validated());

        return $this->show($page);
    }

    public function show(Page $page): PageResource
    {
        $page->load([
            'translations',
            'sections' => fn ($q) => $q->orderBy('sort_order'),
            'sections.translations',
            'sections.image.variants',
        ]);

        return new PageResource($page);
    }

    public function update(UpdatePageRequest $request, Page $page): PageResource
    {
        $page = $this->pages->update($page, $request->validated());

        return $this->show($page);
    }
}
