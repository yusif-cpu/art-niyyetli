<?php

namespace Tests\Feature\Admin;

use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleValidationTest extends TestCase
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

    private function createArticle(array $payload)
    {
        return $this->actingAs($this->admin)->postJson('/admin/articles', $payload);
    }

    public function test_mass_assignment_is_not_possible_via_unexpected_fields(): void
    {
        $response = $this->createArticle($this->validArticlePayload(['id' => 999, 'created_at' => '2000-01-01T00:00:00Z']));

        $response->assertOk();
        $this->assertNotSame(999, $response->json('data.id') ?? $response->json('id'));
        $this->assertNotSame('2000-01-01T00:00:00+00:00', $response->json('data.created_at') ?? $response->json('created_at'));
    }

    public function test_nonexistent_media_id_is_rejected(): void
    {
        $payload = $this->validArticlePayload(['media' => [['media_id' => 999999, 'sort_order' => 0]]]);

        $this->createArticle($payload)->assertStatus(422);
    }

    public function test_invalid_type_value_is_rejected(): void
    {
        $this->createArticle($this->validArticlePayload(['type' => 'invalid-type']))->assertStatus(422);
    }

    public function test_invalid_status_value_is_rejected(): void
    {
        $this->createArticle($this->validArticlePayload(['status' => 'invalid-status']))->assertStatus(422);
    }

    public function test_invalid_published_at_format_is_rejected(): void
    {
        $this->createArticle($this->validArticlePayload(['published_at' => 'not-a-date']))->assertStatus(422);
    }

    public function test_duplicate_translation_locale_within_one_payload_is_rejected(): void
    {
        $payload = $this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'slug-one', 'title' => 'Title One', 'short_text' => 'S', 'content' => 'C'],
                ['locale' => 'az', 'slug' => 'slug-two', 'title' => 'Title Two', 'short_text' => 'S', 'content' => 'C'],
            ],
        ]);

        $this->createArticle($payload)->assertStatus(422);
    }

    public function test_duplicate_localized_slug_different_locale_within_one_payload_is_accepted(): void
    {
        $payload = $this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'same-slug', 'title' => 'Title One', 'short_text' => 'S', 'content' => 'C'],
                ['locale' => 'en', 'slug' => 'same-slug', 'title' => 'Title Two', 'short_text' => 'S', 'content' => 'C'],
            ],
        ]);

        // Different locales with the same slug within one payload are fine.
        $this->createArticle($payload)->assertOk();
    }

    public function test_duplicate_localized_slug_same_locale_within_one_payload_is_rejected(): void
    {
        $payload = $this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'same-slug', 'title' => 'Title One', 'short_text' => 'S', 'content' => 'C'],
                ['locale' => 'az', 'slug' => 'same-slug', 'title' => 'Title Two', 'short_text' => 'S', 'content' => 'C'],
            ],
        ]);

        $this->createArticle($payload)->assertStatus(422);
    }

    public function test_duplicate_localized_slug_against_another_article_is_rejected(): void
    {
        $this->createArticle($this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'existing-slug', 'title' => 'Existing', 'short_text' => 'S', 'content' => 'C'],
            ],
        ]))->assertOk();

        $response = $this->createArticle($this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'existing-slug', 'title' => 'New', 'short_text' => 'S', 'content' => 'C'],
            ],
        ]));

        $response->assertStatus(422);
    }

    public function test_duplicate_media_id_within_media_array_is_rejected(): void
    {
        $media = Media::factory()->create();

        $payload = $this->validArticlePayload([
            'media' => [
                ['media_id' => $media->id, 'sort_order' => 0],
                ['media_id' => $media->id, 'sort_order' => 1],
            ],
        ]);

        $this->createArticle($payload)->assertStatus(422);
    }

    public function test_script_tag_in_short_text_is_rejected(): void
    {
        $payload = $this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'slug-'.uniqid(), 'title' => 'Title', 'short_text' => '<script>alert(1)</script>', 'content' => 'C'],
            ],
        ]);

        $this->createArticle($payload)->assertStatus(422);
    }

    public function test_script_tag_in_content_is_rejected(): void
    {
        $payload = $this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'slug-'.uniqid(), 'title' => 'Title', 'short_text' => 'S', 'content' => '<script>alert(1)</script>'],
            ],
        ]);

        $this->createArticle($payload)->assertStatus(422);
    }

    public function test_iframe_tag_in_content_is_rejected(): void
    {
        $payload = $this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'slug-'.uniqid(), 'title' => 'Title', 'short_text' => 'S', 'content' => '<iframe src="evil.com"></iframe>'],
            ],
        ]);

        $this->createArticle($payload)->assertStatus(422);
    }

    public function test_event_handler_attribute_in_short_text_is_rejected(): void
    {
        $payload = $this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'slug-'.uniqid(), 'title' => 'Title', 'short_text' => '<img src=x onerror=alert(1)>', 'content' => 'C'],
            ],
        ]);

        $this->createArticle($payload)->assertStatus(422);
    }

    public function test_javascript_url_in_content_is_rejected(): void
    {
        $payload = $this->validArticlePayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'slug-'.uniqid(), 'title' => 'Title', 'short_text' => 'S', 'content' => '<a href="javascript:alert(1)">click</a>'],
            ],
        ]);

        $this->createArticle($payload)->assertStatus(422);
    }
}
