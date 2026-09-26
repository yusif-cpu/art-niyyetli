<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ArticleStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\ArticleResource;
use App\Models\Article;
use App\Models\ArticleTranslation;
use App\Support\Api\PaginationParams;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ArticleController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $articles = Article::query()
            ->where('status', ArticleStatus::Published)
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->with(['translations', 'media.variants'])
            ->orderBy('published_at', 'desc')
            ->paginate(PaginationParams::perPage($request))
            ->withQueryString();

        return ArticleResource::collection($articles);
    }

    public function show(string $slug): ArticleResource
    {
        $translation = ArticleTranslation::query()->where('slug', $slug)->first();
        abort_if(! $translation, 404);

        $article = Article::query()
            ->where('id', $translation->article_id)
            ->where('status', ArticleStatus::Published)
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->with(['translations', 'media.variants', 'seoMetadata.ogImage.variants'])
            ->first();

        abort_if(! $article, 404);

        return new ArticleResource($article);
    }
}
