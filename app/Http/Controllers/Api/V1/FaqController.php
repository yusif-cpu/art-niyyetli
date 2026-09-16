<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\FaqResource;
use App\Models\Faq;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FaqController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $faqs = Faq::query()
            ->where('is_active', true)
            ->with('translations')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return FaqResource::collection($faqs);
    }
}
