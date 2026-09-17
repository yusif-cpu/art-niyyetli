<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\MediumResource;
use App\Models\Medium;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MediumController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $mediums = Medium::query()->with('translations')->orderBy('sort_order')->orderBy('id')->get();

        return MediumResource::collection($mediums);
    }
}
