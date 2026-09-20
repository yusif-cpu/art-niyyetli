<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * The slug format rule (App\Rules\Slug) as it is wired into the create/update endpoints of every entity that has a
 * public slug. The rule itself is covered in tests/Unit/Rules/SlugRuleTest.php.
 */
class SlugValidationTest extends TestCase
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

    /** @return array<string, array{0: string}> */
    public static function entities(): array
    {
        return ['page' => ['page'], 'artist' => ['artist'], 'artwork' => ['artwork'], 'article' => ['article'], 'exhibition' => ['exhibition']];
    }

    /** Creates a record with one AZ translation and returns [update URI, payload builder for a given slug]. */
    private function existing(string $kind, string $slug = 'existing-slug'): array
    {
        $az = ['locale' => 'az', 'slug' => $slug];

        switch ($kind) {
            case 'page':
                $model = Page::factory()->create(['type' => 'custom']);
                $model->translations()->create($az + ['title' => 'T', 'content' => 'C']);
                $fields = ['title' => 'T', 'content' => 'C'];
                $uri = "/admin/pages/{$model->id}";
                break;
            case 'artist':
                $model = Artist::factory()->create();
                $model->translations()->create($az + ['first_name' => 'A', 'last_name' => 'B']);
                $fields = ['first_name' => 'A', 'last_name' => 'B'];
                $uri = "/admin/artists/{$model->id}";
                break;
            case 'artwork':
                $model = Artwork::factory()->create();
                $model->translations()->create($az + ['title' => 'T', 'short_description' => 's', 'provenance' => 'p']);
                $fields = ['title' => 'T', 'short_description' => 's', 'provenance' => 'p'];
                $uri = "/admin/artworks/{$model->id}";
                break;
            case 'article':
                $model = Article::factory()->create();
                $model->translations()->create($az + ['title' => 'T', 'short_text' => 's', 'content' => 'c']);
                $fields = ['title' => 'T', 'short_text' => 's', 'content' => 'c'];
                $uri = "/admin/articles/{$model->id}";
                break;
            default:
                $model = Exhibition::factory()->create();
                $model->translations()->create($az + ['title' => 'T', 'venue' => 'v', 'short_text' => 's', 'full_text' => 'f']);
                $fields = ['title' => 'T', 'venue' => 'v', 'short_text' => 's', 'full_text' => 'f'];
                $uri = "/admin/exhibitions/{$model->id}";
        }

        return [$uri, fn (string $newSlug) => ['translations' => [['locale' => 'az', 'slug' => $newSlug] + $fields]], $model];
    }

    #[DataProvider('entities')]
    public function test_an_update_with_a_slug_that_would_break_a_url_is_a_validation_error(string $kind): void
    {
        [$uri, $payload] = $this->existing($kind);

        foreach (['has space', 'a/b', 'a.b', 'under_score', '-leading', 'double--hyphen', '../x'] as $bad) {
            $this->actingAs($this->admin)->putJson($uri, $payload($bad))
                ->assertStatus(422)
                ->assertJsonValidationErrors(['translations.0.slug']);
        }
    }

    #[DataProvider('entities')]
    public function test_an_update_with_a_letters_numbers_and_hyphens_slug_including_azerbaijani_letters_is_accepted(string $kind): void
    {
        [$uri, $payload] = $this->existing($kind);

        foreach (['yeni-sərgi-2026', 'plain-ascii', 'Şəki'] as $good) {
            $this->actingAs($this->admin)->putJson($uri, $payload($good))->assertOk();
        }
    }

    #[DataProvider('entities')]
    public function test_a_slug_over_191_characters_is_refused(string $kind): void
    {
        [$uri, $payload] = $this->existing($kind);

        $this->actingAs($this->admin)->putJson($uri, $payload(str_repeat('a', 192)))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['translations.0.slug']);

        $this->actingAs($this->admin)->putJson($uri, $payload(str_repeat('a', 191)))->assertOk();
    }

    public function test_creating_a_page_with_a_malformed_slug_is_refused(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/pages', [
            'type' => 'custom',
            'is_active' => true,
            'translations' => [['locale' => 'az', 'slug' => 'has space', 'title' => 'T', 'content' => 'C']],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['translations.0.slug']);
    }

    public function test_creating_an_artist_with_a_malformed_slug_is_refused(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artists', [
            'is_active' => true,
            'translations' => [['locale' => 'az', 'slug' => 'a/b', 'first_name' => 'A', 'last_name' => 'B']],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['translations.0.slug']);
    }

    // -- page slugs are top-level paths -----------------------------------------------------------------------

    public function test_a_page_slug_cannot_take_one_of_the_sites_own_addresses(): void
    {
        [$uri, $payload] = $this->existing('page');

        foreach (['admin', 'api', 'artworks', 'artists', 'exhibitions', 'articles', 'contact', 'storage', 'build', 'up', 'home', 'api-docs', 'administrator'] as $reserved) {
            $response = $this->actingAs($this->admin)->putJson($uri, $payload($reserved));

            $response->assertStatus(422)->assertJsonValidationErrors(['translations.0.slug']);
            $this->assertStringContainsString('reserved', $response->json('errors')['translations.0.slug'][0], $reserved);
        }
    }

    public function test_a_new_page_cannot_be_created_on_a_reserved_address(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/pages', [
            'type' => 'custom',
            'is_active' => true,
            'translations' => [['locale' => 'az', 'slug' => 'api-terms', 'title' => 'T', 'content' => 'C']],
        ])->assertStatus(422)->assertJsonValidationErrors(['translations.0.slug']);
    }

    public function test_the_structural_pages_keep_their_home_and_contact_slugs_when_edited(): void
    {
        foreach (['home' => 'Ana səhifə', 'contact' => 'Əlaqə'] as $type => $title) {
            $page = Page::factory()->create(['type' => $type]);
            $page->translations()->create(['locale' => 'az', 'slug' => $type, 'title' => $title, 'content' => 'x']);

            // Saving the page with its own slug unchanged must keep working ...
            $this->actingAs($this->admin)->putJson("/admin/pages/{$page->id}", [
                'translations' => [['locale' => 'az', 'slug' => $type, 'title' => "{$title} yenilənmiş", 'content' => 'y']],
            ])->assertOk();

            $this->assertSame("{$title} yenilənmiş", $page->translations()->where('locale', 'az')->value('title'));
        }
    }

    public function test_a_structural_page_can_still_be_renamed_to_an_ordinary_slug(): void
    {
        $page = Page::factory()->create(['type' => 'contact']);
        $page->translations()->create(['locale' => 'az', 'slug' => 'contact', 'title' => 'Əlaqə', 'content' => 'x']);

        $this->actingAs($this->admin)->putJson("/admin/pages/{$page->id}", [
            'translations' => [['locale' => 'az', 'slug' => 'elaqe', 'title' => 'Əlaqə', 'content' => 'x']],
        ])->assertOk();
    }

    public function test_pages_that_only_resemble_reserved_words_are_fine(): void
    {
        [$uri, $payload] = $this->existing('page');

        foreach (['about', 'privacy-policy', 'our-contact', 'about-artworks', 'upgrade', 'apple'] as $ordinary) {
            $this->actingAs($this->admin)->putJson($uri, $payload($ordinary))->assertOk();
        }
    }

    public function test_reserved_words_are_fine_for_slugs_that_live_under_a_prefix(): void
    {
        // /artists/admin, /articles/home ... never collide with a top-level address.
        foreach (['artist', 'artwork', 'article', 'exhibition'] as $kind) {
            [$uri, $payload] = $this->existing($kind);

            $this->actingAs($this->admin)->putJson($uri, $payload('admin'))->assertOk();
        }
    }

    // -- records that predate the rule ------------------------------------------------------------------------

    #[DataProvider('entities')]
    public function test_a_record_with_an_older_style_slug_can_still_be_saved_with_that_slug_unchanged(string $kind): void
    {
        [$uri, $payload] = $this->existing($kind, 'Old Style Slug');

        $this->actingAs($this->admin)->putJson($uri, $payload('Old Style Slug'))->assertOk();
        $this->actingAs($this->admin)->putJson($uri, $payload('Another Bad Slug'))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['translations.0.slug']);
    }
}
