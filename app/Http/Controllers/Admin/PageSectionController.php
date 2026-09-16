<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderPageSectionsRequest;
use App\Http\Requests\Admin\StorePageSectionRequest;
use App\Http\Requests\Admin\UpdatePageSectionRequest;
use App\Http\Resources\Admin\PageSectionResource;
use App\Models\Page;
use App\Models\PageSection;
use App\Services\Admin\PageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PageSectionController extends Controller
{
    public function __construct(private PageService $pages) {}

    public function index(Page $page): AnonymousResourceCollection
    {
        $sections = $page->sections()
            ->with(['translations', 'image.variants'])
            ->orderBy('sort_order')
            ->get();

        return PageSectionResource::collection($sections);
    }

    public function store(StorePageSectionRequest $request, Page $page): PageSectionResource
    {
        $section = $this->pages->createSection($page, $request->validated());

        return $this->show($section);
    }

    public function update(UpdatePageSectionRequest $request, PageSection $section): PageSectionResource
    {
        $section = $this->pages->updateSection($section, $request->validated());

        return $this->show($section);
    }

    public function reorder(ReorderPageSectionsRequest $request, Page $page): JsonResponse
    {
        $this->pages->reorderSections($page, $request->validated()['items']);

        return response()->json(['message' => 'Sections reordered.']);
    }

    private function show(PageSection $section): PageSectionResource
    {
        $section->load(['translations', 'image.variants']);

        return new PageSectionResource($section);
    }
}
