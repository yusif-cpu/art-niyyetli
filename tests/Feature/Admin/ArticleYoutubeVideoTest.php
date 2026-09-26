<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleYoutubeVideoTest extends TestCase
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
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-article-'.uniqid(), 'title' => 'Test', 'short_text' => 'Short', 'content' => 'Content'],
            ],
        ], $overrides);
    }

    public function test_creating_an_article_with_a_valid_youtube_url_stores_only_the_extracted_id(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/articles', $this->validArticlePayload([
            'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]));

        $response->assertOk();
        $id = $response->json('data.id');

        $this->assertDatabaseHas('articles', ['id' => $id, 'youtube_video_id' => 'dQw4w9WgXcQ']);
        $this->assertSame('dQw4w9WgXcQ', $response->json('data.youtube_video_id'));
    }

    public function test_invalid_youtube_url_is_rejected_and_nothing_is_created(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/articles', $this->validArticlePayload([
            'youtube_url' => 'not a url at all ###',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_url');
        $this->assertDatabaseCount('articles', 0);
    }

    public function test_raw_script_tag_is_rejected(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/articles', $this->validArticlePayload([
            'youtube_url' => '<script>alert(1)</script>',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_url');
    }

    public function test_sending_youtube_video_id_directly_without_a_matching_url_is_still_charset_validated(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/articles', $this->validArticlePayload([
            'youtube_video_id' => '"><script>',
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('youtube_video_id');
        $this->assertDatabaseCount('articles', 0);
    }

    public function test_admin_can_update_and_then_remove_the_video(): void
    {
        $article = Article::factory()->create(['youtube_video_id' => null]);

        $set = $this->actingAs($this->admin)->putJson("/admin/articles/{$article->id}", [
            'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);
        $set->assertOk();
        $this->assertSame('dQw4w9WgXcQ', $article->fresh()->youtube_video_id);

        $removed = $this->actingAs($this->admin)->putJson("/admin/articles/{$article->id}", [
            'youtube_url' => '',
        ]);
        $removed->assertOk();
        $this->assertNull($article->fresh()->youtube_video_id);
    }

    public function test_admin_show_returns_the_video_id_and_watch_url(): void
    {
        $article = Article::factory()->create(['youtube_video_id' => 'dQw4w9WgXcQ']);

        $this->actingAs($this->admin)->getJson("/admin/articles/{$article->id}")
            ->assertOk()
            ->assertJsonPath('data.youtube_video_id', 'dQw4w9WgXcQ')
            ->assertJsonPath('data.youtube_url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

        $none = Article::factory()->create();
        $this->actingAs($this->admin)->getJson("/admin/articles/{$none->id}")
            ->assertJsonPath('data.youtube_video_id', null)
            ->assertJsonPath('data.youtube_url', null);
    }

    public function test_updating_other_fields_without_touching_youtube_url_leaves_the_video_unchanged(): void
    {
        $article = Article::factory()->create(['youtube_video_id' => 'dQw4w9WgXcQ']);

        $response = $this->actingAs($this->admin)->putJson("/admin/articles/{$article->id}", [
            'is_active' => false,
        ]);

        $response->assertOk();
        $this->assertSame('dQw4w9WgXcQ', $article->fresh()->youtube_video_id);
    }
}
