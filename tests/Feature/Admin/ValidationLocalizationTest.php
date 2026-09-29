<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The admin panel's UI is entirely Azerbaijani, but until resources/lang/az/validation.php existed, Laravel had
 * nowhere to look up messages for APP_LOCALE=az and silently fell back to its built-in English ones. These tests
 * exercise a representative rule from each family (required, enum, a custom errors()->add() call) through a real
 * HTTP request, so a regression that breaks locale resolution for admin FormRequests is caught end to end rather
 * than only at the Validator::make() level.
 */
class ValidationLocalizationTest extends TestCase
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

    public function test_a_missing_required_field_returns_an_azerbaijani_message(): void
    {
        // "translations" is entirely omitted (not sent as an empty array) so the "required" rule itself
        // fails, rather than the "array"/"min:1" rules that an empty array would trigger instead.
        $response = $this->actingAs($this->admin)->postJson('/admin/artists', []);

        $response->assertStatus(422);
        $message = $response->json('errors.translations.0');

        $this->assertStringEndsWith('mütləqdir.', $message);
        $this->assertStringNotContainsString('is required', $message);
    }

    public function test_an_invalid_enum_value_returns_an_azerbaijani_message(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/articles', [
            'type' => 'not-a-real-type',
            'status' => 'draft',
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-article', 'title' => 'Test', 'short_text' => 'S', 'content' => 'C'],
            ],
        ]);

        $response->assertStatus(422);
        $message = $response->json('errors.type.0');

        $this->assertSame('Seçilmiş növ etibarsızdır.', $message);
    }

    public function test_a_field_level_attribute_name_reads_in_azerbaijani_not_as_the_raw_field_key(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', [
            'artist_id' => Artist::factory()->create()->id,
            'medium_id' => Medium::factory()->create()->id,
            'genre_id' => Genre::factory()->create()->id,
            // year_created intentionally omitted to trigger a plain "required" failure.
            'width_cm' => 50,
            'height_cm' => 70,
            'price' => 1500,
            'show_price' => true,
            'availability' => 'available',
            'certificate' => false,
            'featured' => false,
            'show_on_wall' => false,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-artwork', 'title' => 'Test', 'short_description' => 'Short', 'provenance' => 'Provenance'],
            ],
        ]);

        $response->assertStatus(422);
        $this->assertSame('il sahəsi mütləqdir.', $response->json('errors.year_created.0'));
    }

    public function test_the_custom_incomplete_translation_message_is_azerbaijani_not_the_hardcoded_english_string(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/articles', [
            'type' => 'news',
            'status' => 'draft',
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-article', 'title' => 'Test', 'short_text' => 'S', 'content' => 'C'],
                ['locale' => 'en', 'slug' => 'test-article-en', 'title' => '', 'short_text' => '', 'content' => ''],
            ],
        ]);

        $response->assertStatus(422);
        // Laravel's validation error bag uses "translations.1.title" as a single flat key (containing literal
        // dots), not a nested "translations" -> "1" -> "title" structure, so it must be read as one key here.
        $message = $response->json('errors')['translations.1.title'][0];

        $this->assertSame('başlıq sahəsi mütləqdir.', $message);
        $this->assertStringNotContainsString('This field is required', $message);
    }

    /**
     * "Each locale may only appear once." was hardcoded separately in nine different Concerns traits before being
     * centralized into validation.custom_messages.duplicate_locale. Triggering it from two unrelated editors
     * (articles and FAQs) and getting byte-for-byte the same sentence proves they now share one translation
     * rather than two copies that happened to read the same.
     */
    public function test_the_duplicate_locale_message_is_centralized_across_unrelated_editors(): void
    {
        $articleResponse = $this->actingAs($this->admin)->postJson('/admin/articles', [
            'type' => 'news',
            'status' => 'draft',
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'one', 'title' => 'One', 'short_text' => 'S', 'content' => 'C'],
                ['locale' => 'az', 'slug' => 'two', 'title' => 'Two', 'short_text' => 'S', 'content' => 'C'],
            ],
        ]);

        $page = Page::factory()->create();
        $faqResponse = $this->actingAs($this->admin)->postJson('/admin/faqs', [
            'page_id' => $page->id,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'question' => 'Q1', 'answer' => 'A1'],
                ['locale' => 'az', 'question' => 'Q2', 'answer' => 'A2'],
            ],
        ]);

        $articleResponse->assertStatus(422);
        $faqResponse->assertStatus(422);

        $expected = 'Hər dil yalnız bir dəfə göstərilə bilər.';
        $this->assertSame($expected, $articleResponse->json('errors.translations.0'));
        $this->assertSame($expected, $faqResponse->json('errors.translations.0'));
    }

    public function test_disallowed_rich_text_content_returns_an_azerbaijani_message(): void
    {
        $page = Page::factory()->create();

        $response = $this->actingAs($this->admin)->postJson('/admin/faqs', [
            'page_id' => $page->id,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'question' => 'Q1', 'answer' => '<script>alert(1)</script>'],
            ],
        ]);

        $response->assertStatus(422);
        $message = $response->json('errors')['translations.0.answer'][0];

        $this->assertStringContainsString('qadağan olunmuş məzmun', $message);
        $this->assertStringNotContainsString('disallowed content', $message);
    }

    public function test_invalid_login_credentials_message_is_azerbaijani(): void
    {
        $response = $this->postJson('/admin/login', ['username' => 'nobody', 'password' => 'wrong-password']);

        $response->assertStatus(422);
        $this->assertSame('Daxil edilən məlumatlar qeydlərimizlə uyğun gəlmir.', $response->json('errors.username.0'));
    }
}
