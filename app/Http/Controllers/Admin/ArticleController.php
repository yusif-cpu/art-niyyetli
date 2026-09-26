<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ArticleDeletionNotAllowedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreArticleRequest;
use App\Http\Requests\Admin\UpdateArticleRequest;
use App\Http\Resources\Admin\ArticleResource;
use App\Models\Article;
use App\Services\Admin\ArticleService;
use App\Support\Api\QueryParams;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ArticleController extends Controller
{
    public function __construct(private ArticleService $articles) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Article::query()
            ->with([
                // Unfiltered: the admin AZ/EN editor needs every existing
                // translation regardless of ?locale= (Phase 08 fix pattern).
                'translations',
                'media.variants',
            ]);

        if ($search = QueryParams::search($request)) {
            $query->whereHas('translations', fn ($t) => QueryParams::whereLike($t, 'title', $search));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = min(100, max(1, $request->integer('per_page', 20)));

        $articles = $query
            ->orderByRaw('published_at IS NULL')
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return ArticleResource::collection($articles);
    }

    public function store(StoreArticleRequest $request): ArticleResource
    {
        $article = $this->articles->create($request->validated());

        return $this->show($article, $request);
    }

    public function show(Article $article, Request $request): ArticleResource
    {
        $article->load(['translations', 'media.variants', 'seoMetadata.ogImage.variants']);

        return new ArticleResource($article);
    }

    public function update(UpdateArticleRequest $request, Article $article): ArticleResource
    {
        $article = $this->articles->update($article, $request->validated());

        return $this->show($article, $request);
    }

    public function destroy(Article $article): JsonResponse
    {
        try {
            $this->articles->delete($article);
        } catch (ArticleDeletionNotAllowedException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['message' => 'Article archived.']);
    }
}
