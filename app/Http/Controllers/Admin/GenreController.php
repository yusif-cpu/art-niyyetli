<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\GenreResource;
use App\Models\Genre;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GenreController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $genres = Genre::query()->with('translations')->orderBy('sort_order')->orderBy('id')->get();

        return GenreResource::collection($genres);
    }
}
