<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\LookupResource;
use App\Models\Medium;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MediumController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $items = Medium::query()
            ->where('is_active', true)
            ->with('translations')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return LookupResource::collection($items);
    }
}
