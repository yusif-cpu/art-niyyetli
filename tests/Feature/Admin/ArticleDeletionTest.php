<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleDeletionTest extends TestCase
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

    public function test_delete_on_draft_article_soft_deletes_it(): void
    {
        $article = Article::factory()->create(['status' => 'draft']);

        $this->actingAs($this->admin)->deleteJson("/admin/articles/{$article->id}")->assertOk();

        $this->assertSoftDeleted('articles', ['id' => $article->id]);
        $this->actingAs($this->admin)->getJson("/admin/articles/{$article->id}")->assertStatus(404);
    }

    public function test_delete_on_published_article_is_refused(): void
    {
        $article = Article::factory()->create(['status' => 'published', 'published_at' => now()]);

        $this->actingAs($this->admin)->deleteJson("/admin/articles/{$article->id}")->assertStatus(409);

        $this->assertDatabaseHas('articles', ['id' => $article->id, 'deleted_at' => null]);
    }

    public function test_delete_on_article_with_attached_media_does_not_delete_underlying_media(): void
    {
        $article = Article::factory()->create(['status' => 'draft']);
        $media = Media::factory()->create();
        $article->media()->attach($media, ['sort_order' => 0]);

        $this->actingAs($this->admin)->deleteJson("/admin/articles/{$article->id}")->assertOk();

        $this->assertSoftDeleted('articles', ['id' => $article->id]);
        $this->assertDatabaseHas('media', ['id' => $media->id]);
        $this->assertDatabaseHas('article_media', ['article_id' => $article->id, 'media_id' => $media->id]);
    }
}
