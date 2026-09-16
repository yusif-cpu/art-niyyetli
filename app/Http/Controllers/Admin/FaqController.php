<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderFaqsRequest;
use App\Http\Requests\Admin\StoreFaqRequest;
use App\Http\Requests\Admin\UpdateFaqRequest;
use App\Http\Resources\Admin\FaqResource;
use App\Models\Faq;
use App\Services\Admin\FaqService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FaqController extends Controller
{
    public function __construct(private FaqService $faqs) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Faq::query()->with('translations');

        if ($request->filled('page_id')) {
            $query->where('page_id', $request->integer('page_id'));
        }

        $faqs = $query->orderBy('sort_order')->orderBy('id')->get();

        return FaqResource::collection($faqs);
    }

    public function store(StoreFaqRequest $request): FaqResource
    {
        $faq = $this->faqs->create($request->validated());

        return $this->show($faq);
    }

    public function show(Faq $faq): FaqResource
    {
        $faq->load('translations');

        return new FaqResource($faq);
    }

    public function update(UpdateFaqRequest $request, Faq $faq): FaqResource
    {
        $faq = $this->faqs->update($faq, $request->validated());

        return $this->show($faq);
    }

    public function destroy(Faq $faq): JsonResponse
    {
        $this->faqs->delete($faq);

        return response()->json(['message' => 'FAQ deleted.']);
    }

    public function reorder(ReorderFaqsRequest $request): JsonResponse
    {
        $this->faqs->reorder($request->validated()['items']);

        return response()->json(['message' => 'FAQs reordered.']);
    }
}
