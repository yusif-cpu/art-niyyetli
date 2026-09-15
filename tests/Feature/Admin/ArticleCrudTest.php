<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ArticleCrudTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    private function validArticlePayload(array $overrides = []): array
    {
        return array_merge([
            'type' => 'news',
            'status' => 'draft',
            'published_at' => null,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-article-'.uniqid(), 'title' => 'Test', 'short_text' => 'Short', 'content' => 'Content'],
            ],
        ], $overrides);
    }

    private function data(TestResponse $response): array
    {
        return $response->json('data') ?? $response->json();
    }

    public function test_create_with_translations_and_media_returns_them_back(): void
    {
        $media = Media::factory()->create();

        $payload = $this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'az-slug-'.uniqid(), 'title' => 'AZ Title', 'short_text' => 'S', 'content' => 'C'],
                ['locale' => 'en', 'slug' => 'en-slug-'.uniqid(), 'title' => 'EN Title', 'short_text' => 'S', 'content' => 'C'],
            ],
            'media' => [
                ['media_id' => $media->id, 'sort_order' => 0],
            ],
        ]);

        $response = $this->actingAs($this->admin)->postJson('/admin/articles', $payload);

        $response->assertOk();
        $data = $this->data($response);

        $this->assertCount(2, $data['translations']);
        $this->assertCount(1, $data['media']);
        $this->assertSame($media->id, $data['media'][0]['id']);

        $this->assertDatabaseHas('article_translations', ['article_id' => $data['id'], 'locale' => 'az']);
        $this->assertDatabaseHas('article_translations', ['article_id' => $data['id'], 'locale' => 'en']);
        $this->assertDatabaseHas('article_media', ['article_id' => $data['id'], 'media_id' => $media->id]);
    }

    public function test_update_with_only_one_locale_does_not_touch_the_other_locale(): void
    {
        $article = Article::factory()->create();
        $article->translations()->create(['locale' => 'az', 'slug' => 'az-slug-'.uniqid(), 'title' => 'AZ Title', 'short_text' => 'S', 'content' => 'C']);
        $article->translations()->create(['locale' => 'en', 'slug' => 'en-slug-'.uniqid(), 'title' => 'EN Title', 'short_text' => 'S', 'content' => 'C']);

        $response = $this->actingAs($this->admin)->putJson("/admin/articles/{$article->id}", [
            'translations' => [
                ['locale' => 'az', 'slug' => 'az-slug-updated-'.uniqid(), 'title' => 'AZ Title Updated', 'short_text' => 'S2', 'content' => 'C2'],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('article_translations', ['article_id' => $article->id, 'locale' => 'en', 'title' => 'EN Title']);
        $this->assertDatabaseHas('article_translations', ['article_id' => $article->id, 'locale' => 'az', 'title' => 'AZ Title Updated']);
    }

    public function test_update_replacing_media_syncs_pivot_without_touching_media_table(): void
    {
        $article = Article::factory()->create();
        $oldMedia = Media::factory()->create();
        $newMedia = Media::factory()->create();
        $article->media()->attach($oldMedia, ['sort_order' => 0]);

        $response = $this->actingAs($this->admin)->putJson("/admin/articles/{$article->id}", [
            'media' => [
                ['media_id' => $newMedia->id, 'sort_order' => 0],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseMissing('article_media', ['article_id' => $article->id, 'media_id' => $oldMedia->id]);
        $this->assertDatabaseHas('article_media', ['article_id' => $article->id, 'media_id' => $newMedia->id]);
        $this->assertDatabaseHas('media', ['id' => $oldMedia->id]);
        $this->assertDatabaseHas('media', ['id' => $newMedia->id]);
    }

    public function test_search_by_translated_title(): void
    {
        $matching = Article::factory()->create();
        $matching->translations()->create(['locale' => 'az', 'slug' => 'unique-slug-'.uniqid(), 'title' => 'Sunset Over Baku', 'short_text' => 'S', 'content' => 'C']);

        $other = Article::factory()->create();
        $other->translations()->create(['locale' => 'az', 'slug' => 'other-slug-'.uniqid(), 'title' => 'Unrelated', 'short_text' => 'S', 'content' => 'C']);

        $response = $this->actingAs($this->admin)->getJson('/admin/articles?search=Sunset');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_filters_by_type_status_and_is_active(): void
    {
        $match = Article::factory()->create(['status' => 'published', 'type' => 'news', 'is_active' => true, 'published_at' => now()]);
        Article::factory()->create(['status' => 'draft', 'type' => 'interview', 'is_active' => false]);

        $response = $this->actingAs($this->admin)->getJson('/admin/articles?status=published&type=news&is_active=1');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($match->id));
        $this->assertCount(1, $ids);
    }

    public function test_pagination_returns_correct_page_shape(): void
    {
        Article::factory()->count(25)->create();

        $response = $this->actingAs($this->admin)->getJson('/admin/articles?per_page=10');

        $response->assertOk();
        $this->assertCount(10, $response->json('data'));
        $this->assertSame(25, $response->json('meta.total'));
        $this->assertSame(3, $response->json('meta.last_page'));
    }

    public function test_listing_orders_published_articles_newest_first_with_drafts_last(): void
    {
        $oldPublished = Article::factory()->create(['status' => 'published', 'published_at' => now()->subDays(5)]);
        $newPublished = Article::factory()->create(['status' => 'published', 'published_at' => now()->subDay()]);
        $draft = Article::factory()->create(['status' => 'draft', 'published_at' => null]);

        $response = $this->actingAs($this->admin)->getJson('/admin/articles');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->values();

        $this->assertSame($newPublished->id, $ids[0]);
        $this->assertSame($oldPublished->id, $ids[1]);
        $this->assertSame($draft->id, $ids[2]);
    }
}
