<?php

namespace Tests\Feature\Schema;

use App\Models\Article;
use App\Models\ArticleTranslation;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_draft_article_can_have_null_published_at(): void
    {
        $article = Article::create(['type' => 'news', 'status' => 'draft']);

        $this->assertNull($article->fresh()->published_at);
    }

    public function test_slug_uniqueness_per_locale_is_enforced(): void
    {
        $article1 = Article::create(['type' => 'news', 'status' => 'published', 'published_at' => now()]);
        $article2 = Article::create(['type' => 'announcement', 'status' => 'published', 'published_at' => now()]);

        ArticleTranslation::create([
            'article_id' => $article1->id, 'locale' => 'az', 'slug' => 'yeni-sergi',
            'title' => 'Yeni sərgi', 'short_text' => 'qısa', 'content' => 'tam',
        ]);

        $this->expectException(QueryException::class);
        ArticleTranslation::create([
            'article_id' => $article2->id, 'locale' => 'az', 'slug' => 'yeni-sergi',
            'title' => 'Başqa', 'short_text' => 'qısa', 'content' => 'tam',
        ]);
    }

    public function test_article_soft_deletes(): void
    {
        $article = Article::create(['type' => 'interview', 'status' => 'draft']);
        $article->delete();

        $this->assertSame(0, Article::count());
        $this->assertSame(1, Article::withTrashed()->count());
    }
}
