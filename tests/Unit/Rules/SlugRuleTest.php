<?php

namespace Tests\Unit\Rules;

use App\Models\Artist;
use App\Models\Page;
use App\Rules\Slug;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SlugRuleTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<int, string> the validation errors for a slug ([] when it is accepted) */
    private function errors(mixed $value, ?Slug $rule = null): array
    {
        return Validator::make(['slug' => $value], ['slug' => [$rule ?? new Slug]])->errors()->get('slug');
    }

    #[DataProvider('validSlugs')]
    public function test_it_accepts_letters_numbers_and_single_hyphens(string $slug): void
    {
        $this->assertSame([], $this->errors($slug), $slug);
    }

    /** @return array<string, array{0: string}> */
    public static function validSlugs(): array
    {
        return array_map(fn (string $s) => [$s], [
            'ascii' => 'collectors',
            'hyphenated' => 'privacy-policy',
            'a single character' => 'a',
            'digits only' => '2026',
            'leading digit' => '2026-spring-show',
            'capitals' => 'AbC-Def',
            'Azerbaijani letters' => 'nərminə-qasımova',
            'Azerbaijani capitals' => 'Şəki-Ünvan',
            'Cyrillic' => 'галерея',
        ]);
    }

    #[DataProvider('invalidSlugs')]
    public function test_it_rejects_anything_that_would_break_a_url(mixed $slug): void
    {
        $errors = $this->errors($slug);

        $this->assertCount(1, $errors, var_export($slug, true));
        $this->assertStringContainsString('letters and numbers', $errors[0]);
    }

    /**
     * (Empty and whitespace-only values are not listed: Laravel skips non-implicit rules for them, and the
     * `required` rule in every request reports them.)
     *
     * @return array<string, array{0: string}>
     */
    public static function invalidSlugs(): array
    {
        return array_map(fn (string $s) => [$s], [
            'a space' => 'has space',
            'a slash' => 'a/b',
            'a backslash' => 'a\\b',
            'a question mark' => 'a?b',
            'a hash' => 'a#b',
            'path traversal' => '../evil',
            'a dot' => 'a.b',
            'two dots' => 'a..b',
            'a file name' => 'sitemap.xml',
            'robots file' => 'robots.txt',
            'a leading hyphen' => '-lead',
            'a trailing hyphen' => 'trail-',
            'a doubled hyphen' => 'double--hyphen',
            'an underscore' => 'under_score',
            'a percent escape' => 'a%2Fb',
            'markup' => '<script>',
            'an emoji' => 'gallery😀',
            'a newline' => "new\nline",
            'a trailing newline' => "trailing\n",
            'a tab' => "a\tb",
            'an at sign' => 'a@b',
            'a colon' => 'a:b',
        ]);
    }

    public function test_it_ignores_values_that_are_not_strings_so_the_string_rule_reports_them(): void
    {
        foreach ([['a'], 123, null, true] as $value) {
            $rule = new Slug;
            $failed = false;
            $rule->validate('slug', $value, function () use (&$failed) {
                $failed = true;
            });

            $this->assertFalse($failed, var_export($value, true));
        }
    }

    public function test_it_accepts_up_to_191_characters_counted_as_characters_not_bytes(): void
    {
        $this->assertSame([], $this->errors(str_repeat('a', 191)));
        $this->assertSame([], $this->errors(str_repeat('ə', 191)), 'multi-byte letters count once each');

        $errors = $this->errors(str_repeat('a', 192));
        $this->assertCount(1, $errors);
        $this->assertStringContainsString('191', $errors[0]);
    }

    #[DataProvider('reservedPageSlugs')]
    public function test_a_top_level_page_slug_may_not_use_the_sites_own_addresses(string $slug): void
    {
        $errors = $this->errors($slug, new Slug(topLevel: true));

        $this->assertCount(1, $errors, $slug);
        $this->assertStringContainsString('reserved', $errors[0]);
    }

    /** @return array<string, array{0: string}> */
    public static function reservedPageSlugs(): array
    {
        return array_map(fn (string $s) => [$s], [
            'admin' => 'admin',
            'api' => 'api',
            'artworks' => 'artworks',
            'artists' => 'artists',
            'exhibitions' => 'exhibitions',
            'articles' => 'articles',
            'contact' => 'contact',
            'storage' => 'storage',
            'build' => 'build',
            'up' => 'up',
            'home' => 'home',
            'any case' => 'Admin',
            'api prefix' => 'api-docs',
            'admin prefix' => 'administrator',
            'admin hyphen prefix' => 'admin-guide',
            'bare api prefix' => 'apiary',
        ]);
    }

    #[DataProvider('ordinaryPageSlugs')]
    public function test_a_top_level_page_slug_that_only_resembles_a_reserved_word_is_fine(string $slug): void
    {
        $this->assertSame([], $this->errors($slug, new Slug(topLevel: true)), $slug);
    }

    /** @return array<string, array{0: string}> */
    public static function ordinaryPageSlugs(): array
    {
        return array_map(fn (string $s) => [$s], [
            'about' => 'about',
            'collectors' => 'collectors',
            'privacy-policy' => 'privacy-policy',
            'contains a reserved word' => 'about-artworks',
            'ends with a reserved word' => 'our-contact',
            'starts like up' => 'upgrade',
            'starts like api letters' => 'apple',
            'starts with add' => 'address',
        ]);
    }

    public function test_entity_slugs_are_not_top_level_so_reserved_words_are_allowed_there(): void
    {
        // Artist, artwork, article and exhibition slugs live under /artists/, /articles/ ... so only the format matters.
        foreach (['admin', 'api-docs', 'home', 'contact'] as $slug) {
            $this->assertSame([], $this->errors($slug, new Slug), $slug);
        }
    }

    public function test_a_page_keeps_its_own_reserved_slug_unchanged(): void
    {
        // The structural pages own "home" and "contact"; editing them must keep working.
        $home = Page::factory()->create();
        $home->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'x']);

        $this->assertSame([], $this->errors('home', new Slug($home, topLevel: true)));
    }

    public function test_the_exemption_belongs_to_that_record_only(): void
    {
        $home = Page::factory()->create();
        $home->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'x']);
        $another = Page::factory()->create();

        $this->assertCount(1, $this->errors('home', new Slug($another, topLevel: true)));
        $this->assertCount(1, $this->errors('home', new Slug(topLevel: true)), 'a new page cannot take it either');
    }

    public function test_the_exemption_covers_only_the_exact_existing_value(): void
    {
        $home = Page::factory()->create();
        $home->translations()->create(['locale' => 'az', 'slug' => 'home', 'title' => 'Ana səhifə', 'content' => 'x']);

        $this->assertCount(1, $this->errors('contact', new Slug($home, topLevel: true)), 'a different reserved word is still refused');
        $this->assertCount(1, $this->errors('home page', new Slug($home, topLevel: true)), 'a malformed variation is still refused');
    }

    public function test_an_older_record_with_a_slug_that_no_longer_meets_the_format_can_still_be_saved_unchanged(): void
    {
        $artist = Artist::factory()->create();
        $artist->translations()->create(['locale' => 'az', 'slug' => 'Legacy Slug With Spaces', 'first_name' => 'A', 'last_name' => 'B']);

        $this->assertSame([], $this->errors('Legacy Slug With Spaces', new Slug($artist)));
        $this->assertCount(1, $this->errors('Another Bad Slug', new Slug($artist)), 'but a changed value must be valid');
        $this->assertSame([], $this->errors('good-new-slug', new Slug($artist)));
    }

    public function test_the_owner_lookup_only_runs_when_a_value_would_otherwise_be_refused(): void
    {
        $artist = Artist::factory()->create();

        $queries = 0;
        DB::listen(function () use (&$queries) {
            $queries++;
        });

        $this->assertSame([], $this->errors('perfectly-fine', new Slug($artist)));
        $this->assertSame(0, $queries);
    }
}
