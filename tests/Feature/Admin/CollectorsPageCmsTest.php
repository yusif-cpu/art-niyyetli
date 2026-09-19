<?php

namespace Tests\Feature\Admin;

use App\Models\NavigationItem;
use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PageSeeder;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * "Kolleksionerlər üçün" (/collectors) is a normal CMS Page of type `collectors`:
 * seeded by PageSeeder, listed and editable in Admin → Pages, linked from the
 * header navigation by page_id, and served through the public page API and
 * server-rendered SEO head — no collectors-specific CMS code exists.
 */
class CollectorsPageCmsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));

        $this->seed(PageSeeder::class);
    }

    private function collectors(): Page
    {
        return Page::query()->where('type', 'collectors')->firstOrFail();
    }

    public function test_collectors_page_is_listed_in_admin_pages_with_az_and_en_translations(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/admin/pages');

        $response->assertOk();
        $entry = collect($response->json('data'))->firstWhere('type', 'collectors');

        $this->assertNotNull($entry);
        $this->assertSame($this->collectors()->id, $entry['id']);
        $this->assertTrue($entry['is_active']);
        $this->assertSame('Kolleksionerlər üçün', $entry['translation']['title']);
        $this->assertEqualsCanonicalizing(['az', 'en'], array_column($entry['translations'], 'locale'));
    }

    public function test_header_navigation_links_to_the_collectors_page_through_page_id(): void
    {
        $item = NavigationItem::query()->where('placement', 'header')->where('page_id', $this->collectors()->id)->first();
        $this->assertNotNull($item);
        $this->assertSame('page', $item->nav_type->value);
        $this->assertNull($item->route_key);

        $az = collect($this->getJson('/api/v1/navigation')->assertOk()->json('data.header'))->firstWhere('href', '/collectors');
        $en = collect($this->getJson('/api/v1/navigation?locale=en')->assertOk()->json('data.header'))->firstWhere('href', '/collectors');

        $this->assertSame('Kolleksionerlər üçün', $az['title']);
        $this->assertSame('For collectors', $en['title']);
    }

    public function test_public_api_serves_the_seeded_placeholder_in_each_locales_own_language(): void
    {
        $az = $this->getJson('/api/v1/pages/collectors')->assertOk();
        $az->assertJsonPath('data.type', 'collectors');
        $az->assertJsonPath('data.title', 'Kolleksionerlər üçün');
        $this->assertStringContainsString('məzmunu tezliklə əlavə olunacaq', $az->json('data.content'));

        $en = $this->getJson('/api/v1/pages/collectors?locale=en')->assertOk();
        $en->assertJsonPath('data.title', 'For collectors');
        $this->assertStringContainsString('will be added soon', $en->json('data.content'));
        $this->assertStringNotContainsString('səhifəsinin', $en->json('data.content'));
    }

    public function test_client_can_edit_content_and_sections_from_admin_and_the_public_page_reflects_it(): void
    {
        $id = $this->collectors()->id;

        $this->actingAs($this->admin)->putJson("/admin/pages/{$id}", [
            'translations' => [
                ['locale' => 'az', 'slug' => 'collectors', 'title' => 'Kolleksionerlər üçün', 'content' => 'AZ əsas mətn'],
                ['locale' => 'en', 'slug' => 'collectors', 'title' => 'For collectors', 'content' => 'EN main text'],
            ],
        ])->assertOk();

        $this->actingAs($this->admin)->postJson("/admin/pages/{$id}/sections", [
            'key' => 'how-to-buy',
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'heading' => 'Necə almaq olar', 'body' => 'AZ bölmə mətni'],
                ['locale' => 'en', 'heading' => 'How to buy', 'body' => 'EN section text'],
            ],
        ])->assertOk();

        $az = $this->getJson('/api/v1/pages/collectors')->assertOk();
        $az->assertJsonPath('data.content', 'AZ əsas mətn');
        $az->assertJsonPath('data.sections.0.heading', 'Necə almaq olar');
        $az->assertJsonPath('data.sections.0.body', 'AZ bölmə mətni');

        $en = $this->getJson('/api/v1/pages/collectors?locale=en')->assertOk();
        $en->assertJsonPath('data.content', 'EN main text');
        $en->assertJsonPath('data.sections.0.heading', 'How to buy');
    }

    public function test_server_rendered_head_for_collectors_uses_the_cms_content(): void
    {
        $id = $this->collectors()->id;

        $this->actingAs($this->admin)->putJson("/admin/pages/{$id}", [
            'translations' => [
                ['locale' => 'en', 'slug' => 'collectors', 'title' => 'For collectors', 'content' => 'Guidance for new collectors.'],
            ],
        ])->assertOk();

        $response = $this->get('/collectors?locale=en');

        $response->assertOk();
        $response->assertSee('<title>For collectors — ArtNiyyətli</title>', false);
        $response->assertSee('<meta name="description" content="Guidance for new collectors.">', false);
        $response->assertSee('<link rel="canonical" href="http://localhost:8080/collectors">', false);

        $this->get('/sitemap.xml')->assertSee('http://localhost:8080/collectors', false);
    }

    public function test_reseeding_does_not_overwrite_client_edits_to_the_collectors_page(): void
    {
        $page = $this->collectors();
        $nav = NavigationItem::query()->where('page_id', $page->id)->firstOrFail();

        $page->update(['is_active' => false]);
        $page->translations()->where('locale', 'en')->update(['title' => 'Collectors', 'content' => 'Client copy']);
        $nav->update(['sort_order' => 9, 'is_visible' => false]);

        $this->seed(PageSeeder::class);

        $this->assertFalse($page->fresh()->is_active);
        $this->assertSame('Client copy', $page->translations()->where('locale', 'en')->value('content'));
        $this->assertSame('Collectors', $page->translations()->where('locale', 'en')->value('title'));
        $this->assertSame(9, $nav->fresh()->sort_order);
        $this->assertFalse($nav->fresh()->is_visible);
        $this->assertSame(1, Page::query()->where('type', 'collectors')->count());
    }

    public function test_migration_repairs_only_the_legacy_mixed_language_placeholder(): void
    {
        $page = $this->collectors();
        $en = fn () => $page->translations()->where('locale', 'en');

        $en()->update(['content' => 'For collectors səhifəsinin məzmunu tezliklə əlavə olunacaq.']);
        $this->runPlaceholderRepairMigration();
        $this->assertSame('Content for the "For collectors" page will be added soon.', $en()->value('content'));

        $en()->update(['content' => 'Content the client already wrote.']);
        $this->runPlaceholderRepairMigration();
        $this->assertSame('Content the client already wrote.', $en()->value('content'));

        $this->assertSame(
            'Kolleksionerlər üçün səhifəsinin məzmunu tezliklə əlavə olunacaq.',
            $page->translations()->where('locale', 'az')->value('content')
        );
    }

    private function runPlaceholderRepairMigration(): void
    {
        $migration = require database_path('migrations/2026_09_20_000002_fix_singleton_page_placeholder_content.php');
        DB::transaction(fn () => $migration->up());
    }
}
