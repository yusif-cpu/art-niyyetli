<?php

namespace Tests\Feature\Api;

use App\Models\Article;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeArticle(array $overrides = []): Article
    {
        $article = Article::factory()->create(array_merge([
            'status' => 'published',
            'is_active' => true,
            'published_at' => now()->subDay(),
        ], $overrides));

        $article->translations()->create([
            'locale' => 'az',
            'slug' => 'article-'.$article->id,
            'title' => 'Başlıq '.$article->id,
            'short_text' => 'Short',
            'content' => 'Content',
        ]);

        return $article;
    }

    public function test_draft_article_absent_from_list_and_404_on_slug(): void
    {
        $draft = $this->makeArticle(['status' => 'draft', 'published_at' => null]);

        $this->getJson('/api/v1/articles')->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/articles/article-{$draft->id}")->assertStatus(404);
    }

    public function test_future_published_at_absent(): void
    {
        $future = $this->makeArticle(['published_at' => now()->addWeek()]);

        $this->getJson('/api/v1/articles')->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/articles/article-{$future->id}")->assertStatus(404);
    }

    public function test_inactive_or_deleted_absent(): void
    {
        $this->makeArticle(['is_active' => false]);
        $deleted = $this->makeArticle();
        $deleted->delete();

        $this->getJson('/api/v1/articles')->assertJsonCount(0, 'data');
    }

    public function test_published_article_present_with_expected_fields(): void
    {
        $article = $this->makeArticle();

        $response = $this->getJson("/api/v1/articles/article-{$article->id}");

        $response->assertOk();
        $response->assertJsonPath('data.slug', 'article-'.$article->id);
        $response->assertJsonPath('data.title', 'Başlıq '.$article->id);
        $response->assertJsonPath('data.short_text', 'Short');
        $response->assertJsonPath('data.content', 'Content');
        $this->assertNotNull($response->json('data.published_at'));
    }

    public function test_locale_fallback_per_field(): void
    {
        $article = $this->makeArticle();
        $article->translations()->create(['locale' => 'en', 'slug' => 'article-en-'.$article->id, 'title' => '', 'short_text' => 'EN short', 'content' => 'EN content']);

        $response = $this->getJson("/api/v1/articles/article-{$article->id}?locale=en");

        $response->assertOk();
        $this->assertSame('Başlıq '.$article->id, $response->json('data.title'));
        $this->assertSame('EN short', $response->json('data.short_text'));
    }

    public function test_video_is_null_when_article_has_no_youtube_video(): void
    {
        $article = $this->makeArticle();

        $this->getJson("/api/v1/articles/article-{$article->id}")->assertOk()->assertJsonPath('data.video', null);
        $this->getJson('/api/v1/articles')->assertOk()->assertJsonPath('data.0.video', null);
    }

    public function test_video_block_is_exposed_on_show_and_index_when_article_has_a_youtube_video(): void
    {
        $article = $this->makeArticle(['youtube_video_id' => 'dQw4w9WgXcQ']);

        $show = $this->getJson("/api/v1/articles/article-{$article->id}");
        $show->assertOk();
        $show->assertJsonPath('data.video.id', 'dQw4w9WgXcQ');
        $show->assertJsonPath('data.video.embed_url', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
        $show->assertJsonPath('data.media', []); // the video is its own field, not a media[] entry

        $this->getJson('/api/v1/articles')->assertOk()->assertJsonPath('data.0.video.id', 'dQw4w9WgXcQ');
    }
}
