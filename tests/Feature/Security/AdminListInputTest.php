<?php

namespace Tests\Feature\Security;

use App\Models\Article;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use App\Models\Exhibition;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Malformed query strings on the admin GET endpoints: an array where a plain value is expected used to end in a
 * 500 (`?search[]=x`, `?locale[]=x`). It is now an ordinary 422 validation error, everything that worked before
 * still works, and the search box matches what was typed literally instead of treating `%` and `_` as wildcards.
 */
class AdminListInputTest extends TestCase
{
    use RefreshDatabase;

    /** Every admin GET endpoint, list or lookup. */
    private const ENDPOINTS = [
        'media', 'artworks', 'artists', 'articles', 'exhibitions', 'enquiries', 'pages', 'faqs',
        'genres', 'mediums', 'social-links', 'navigation', 'users', 'settings', 'dashboard',
    ];

    /** The parameters the admin GET endpoints read as plain values. */
    private const PARAMETERS = [
        'search', 'locale', 'type', 'status', 'availability', 'subject', 'from', 'to',
        'artwork_id', 'artist_id', 'medium_id', 'genre_id', 'page_id',
        'is_active', 'featured', 'show_on_wall', 'per_page', 'page',
    ];

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    private function adminGet(string $uri): TestResponse
    {
        return $this->actingAs($this->admin)->getJson($uri);
    }

    /** @return array<int, int> ids in the response, in order */
    private function idsFor(string $uri): array
    {
        return collect($this->adminGet($uri)->assertOk()->json('data'))->pluck('id')->all();
    }

    public function test_an_array_valued_parameter_is_a_validation_error_never_a_server_error(): void
    {
        foreach (self::ENDPOINTS as $endpoint) {
            foreach (self::PARAMETERS as $parameter) {
                foreach (["{$parameter}[]=x", "{$parameter}[key]=x"] as $query) {
                    $response = $this->adminGet("/admin/{$endpoint}?{$query}");

                    $response->assertStatus(422);
                    $response->assertJsonValidationErrors([$parameter]);
                    $this->assertIsString($response->json('message'), "{$endpoint}?{$query}");
                }
            }
        }
    }

    public function test_the_two_reproduced_server_errors_are_fixed(): void
    {
        // Straight from the audit's probe: these returned 500 before.
        foreach (['media', 'artworks', 'artists', 'articles', 'exhibitions', 'enquiries'] as $endpoint) {
            $this->adminGet("/admin/{$endpoint}?search[]=x")->assertStatus(422)->assertJsonValidationErrors(['search']);
        }

        foreach (['media', 'artworks', 'artists', 'articles', 'exhibitions', 'pages', 'faqs'] as $endpoint) {
            $this->adminGet("/admin/{$endpoint}?locale[]=x")->assertStatus(422)->assertJsonValidationErrors(['locale']);
        }
    }

    public function test_an_unauthenticated_caller_gets_401_not_a_validation_error(): void
    {
        $this->getJson('/admin/media?search[]=x')->assertStatus(401);
        $this->getJson('/admin/artists?locale[]=x')->assertStatus(401);
    }

    public function test_a_signed_in_user_without_admin_access_gets_403_not_a_validation_error(): void
    {
        $nobody = User::factory()->create(['username' => 'no.role']);

        $this->actingAs($nobody)->getJson('/admin/media?search[]=x')->assertStatus(403);
    }

    #[DataProvider('scalarOddities')]
    public function test_scalar_values_that_worked_before_still_work_exactly_as_before(string $query): void
    {
        foreach (['media', 'artworks', 'artists', 'articles', 'exhibitions', 'enquiries', 'pages', 'faqs', 'genres', 'mediums'] as $endpoint) {
            $this->adminGet("/admin/{$endpoint}?{$query}")->assertOk();
        }
    }

    /** @return array<string, array{0: string}> */
    public static function scalarOddities(): array
    {
        return array_map(fn (string $q) => [$q], [
            'non-numeric per_page' => 'per_page=abc',
            'zero per_page' => 'per_page=0',
            'huge per_page' => 'per_page=99999',
            'negative page' => 'page=-3',
            'non-numeric page' => 'page=abc',
            'absurd page' => 'page=99999999999999999999',
            'non-numeric id' => 'artwork_id=abc',
            'malformed from date' => 'from=garbage',
            'impossible to date' => 'to=2026-13-45',
            'unknown locale' => 'locale=zz',
            'empty locale' => 'locale=',
            'unknown type' => 'type=bogus',
            'unknown status' => 'status=bogus',
            'non-boolean flag' => 'is_active=maybe',
            'empty search' => 'search=',
            'wildcard search' => 'search=%25',
            'underscore search' => 'search=_',
            'hyphenated search' => 'search=a-b',
        ]);
    }

    public function test_the_longest_accepted_search_is_255_characters(): void
    {
        $this->adminGet('/admin/media?search='.str_repeat('a', 255))->assertOk();
        $this->adminGet('/admin/media?search='.str_repeat('a', 256))->assertStatus(422)->assertJsonValidationErrors(['search']);
    }

    public function test_filters_paging_and_search_still_combine(): void
    {
        Media::factory()->count(3)->create(['original_filename' => 'portrait-final.jpg']);
        Media::factory()->create(['original_filename' => 'landscape.jpg']);

        $response = $this->adminGet('/admin/media?search=portrait&type=image&per_page=2&page=2')->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame(3, $response->json('meta.total'));
        $this->assertSame(2, $response->json('meta.current_page'));
    }

    public function test_search_still_matches_substrings_ignoring_case_and_surrounding_spaces(): void
    {
        $match = Media::factory()->create(['original_filename' => 'Portrait-Final.JPG']);
        Media::factory()->create(['original_filename' => 'landscape.jpg']);

        $this->assertSame([$match->id], $this->idsFor('/admin/media?search=%20portrait%20'));
    }

    // -- literal matching of % and _ on every searchable endpoint --------------------------------------------

    public function test_media_search_matches_percent_and_underscore_literally(): void
    {
        $percent = Media::factory()->create(['original_filename' => 'AB%CD.jpg']);
        $underscore = Media::factory()->create(['original_filename' => 'AB_CD.jpg']);
        Media::factory()->create(['original_filename' => 'ABXCD.jpg']);
        Media::factory()->create(['original_filename' => 'ABYYCD.jpg']);

        $this->assertSame([$percent->id], $this->idsFor('/admin/media?search='.urlencode('B%C')));
        $this->assertSame([$underscore->id], $this->idsFor('/admin/media?search='.urlencode('B_C')));
        $this->assertSame([$percent->id], $this->idsFor('/admin/media?search='.urlencode('%')));
        $this->assertSame([$underscore->id], $this->idsFor('/admin/media?search='.urlencode('_')));
    }

    public function test_the_escape_character_itself_is_matched_literally(): void
    {
        $bang = Media::factory()->create(['original_filename' => 'wow!.jpg']);
        Media::factory()->create(['original_filename' => 'wow.jpg']);

        $this->assertSame([$bang->id], $this->idsFor('/admin/media?search='.urlencode('!')));
        $this->assertSame([$bang->id], $this->idsFor('/admin/media?search='.urlencode('w!.')));
    }

    public function test_artwork_search_matches_percent_and_underscore_literally_in_code_and_title(): void
    {
        $byCode = Artwork::factory()->create(['inventory_code' => 'AN-1%-A']);
        Artwork::factory()->create(['inventory_code' => 'AN-1X-A']);

        $byTitle = Artwork::factory()->create(['inventory_code' => 'AN-2-A']);
        $other = Artwork::factory()->create(['inventory_code' => 'AN-3-A']);
        foreach ([[$byCode, 'Plain'], [$byTitle, 'Sunset_View'], [$other, 'SunsetXView']] as [$artwork, $title]) {
            $artwork->translations()->create(['locale' => 'az', 'slug' => 'artwork-'.$artwork->id, 'title' => $title, 'short_description' => 's', 'provenance' => 'p']);
        }

        $this->assertSame([$byCode->id], $this->idsFor('/admin/artworks?search='.urlencode('1%-')));
        $this->assertSame([$byTitle->id], $this->idsFor('/admin/artworks?search='.urlencode('t_V')));
    }

    public function test_artist_search_matches_percent_and_underscore_literally_in_first_and_last_names(): void
    {
        $first = $this->artist('A_b', 'Soy');
        $last = $this->artist('Ad', 'Q%z');
        $this->artist('AXb', 'Soy');
        $this->artist('Ad', 'QYz');

        $this->assertSame([$first->id], $this->idsFor('/admin/artists?search='.urlencode('A_b')));
        $this->assertSame([$last->id], $this->idsFor('/admin/artists?search='.urlencode('Q%z')));
    }

    private function artist(string $firstName, string $lastName): Artist
    {
        $artist = Artist::factory()->create();
        $artist->translations()->create(['locale' => 'az', 'slug' => 'artist-'.$artist->id, 'first_name' => $firstName, 'last_name' => $lastName]);

        return $artist;
    }

    public function test_article_search_matches_percent_literally_in_titles(): void
    {
        $match = $this->article('Sale 50% off');
        $this->article('Sale 50 percent off');

        $this->assertSame([$match->id], $this->idsFor('/admin/articles?search='.urlencode('50%')));
    }

    private function article(string $title): Article
    {
        $article = Article::factory()->create();
        $article->translations()->create(['locale' => 'az', 'slug' => 'article-'.$article->id, 'title' => $title, 'short_text' => 's', 'content' => 'c']);

        return $article;
    }

    public function test_exhibition_search_matches_underscore_literally_in_titles(): void
    {
        $match = $this->exhibition('Spring_Show');
        $this->exhibition('SpringXShow');

        $this->assertSame([$match->id], $this->idsFor('/admin/exhibitions?search='.urlencode('g_S')));
    }

    private function exhibition(string $title): Exhibition
    {
        $exhibition = Exhibition::factory()->create();
        $exhibition->translations()->create(['locale' => 'az', 'slug' => 'exhibition-'.$exhibition->id, 'title' => $title, 'venue' => 'v', 'short_text' => 's', 'full_text' => 'f']);

        return $exhibition;
    }

    public function test_enquiry_search_matches_percent_and_underscore_literally_in_name_email_and_code(): void
    {
        $subject = EnquirySubject::query()->firstOrCreate(['key' => 'general_contact'], ['sort_order' => 0, 'is_active' => true]);
        $make = fn (array $fields) => Enquiry::query()->create(array_merge([
            'enquiry_subject_id' => $subject->id, 'submitted_at' => now(), 'name' => 'Person', 'contact' => 'x@example.com',
            'email' => 'x@example.com', 'message' => 'Hello', 'status' => 'new',
        ], $fields));

        $byName = $make(['name' => 'Rate 100%']);
        $byEmail = $make(['email' => 'first_last@example.com']);
        $byCode = $make(['inventory_code' => 'AN-9%-Z']);
        $make(['name' => 'Rate 100 percent']);
        $make(['email' => 'firstXlast@example.com']);
        $make(['inventory_code' => 'AN-9X-Z']);

        $this->assertSame([$byName->id], $this->idsFor('/admin/enquiries?search='.urlencode('100%')));
        $this->assertSame([$byEmail->id], $this->idsFor('/admin/enquiries?search='.urlencode('t_l')));
        $this->assertSame([$byCode->id], $this->idsFor('/admin/enquiries?search='.urlencode('9%-')));
    }
}
