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
 * "Kolleksionerlər üçün" (/collectors) is not part of the client's requirements, so it is unlisted: the page stays
 * in the database as a normal CMS Page of type `collectors` (seeded by PageSeeder, editable in Admin → Pages) but is
 * inactive and has no navigation item — it is absent from the public menu and Admin → Navigation, and /collectors
 * answers 404. An admin can still re-activate and re-link it. No collectors-specific CMS code exists.
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

    public function test_collectors_page_is_seeded_inactive_without_a_navigation_item(): void
    {
        $this->assertFalse($this->collectors()->is_active);
        $this->assertSame(0, NavigationItem::query()->where('page_id', $this->collectors()->id)->count());
        $this->assertSame(2, $this->collectors()->translations()->count());
    }

    public function test_inactive_collectors_page_is_hidden_from_the_admin_pages_list_but_other_inactive_pages_are_not(): void
    {
        $custom = Page::query()->create(['type' => 'custom', 'is_active' => false]);
        $custom->translations()->create(['locale' => 'az', 'slug' => 'inactive-custom', 'title' => 'Inactive custom', 'content' => 'C']);

        $types = collect($this->actingAs($this->admin)->getJson('/admin/pages')->assertOk()->json('data'));

        $this->assertNull($types->firstWhere('type', 'collectors'));
        $this->assertNotNull($types->firstWhere('id', $custom->id), 'general inactive pages must stay manageable');
        $this->assertNotNull($types->firstWhere('type', 'home'));
    }

    public function test_hidden_collectors_page_is_still_reachable_by_id_and_can_be_reactivated_which_lists_it_again(): void
    {
        $id = $this->collectors()->id;

        $show = $this->actingAs($this->admin)->getJson("/admin/pages/{$id}")->assertOk();
        $this->assertFalse($show->json('data.is_active'));
        $this->assertCount(2, $show->json('data.translations'));

        $this->actingAs($this->admin)->putJson("/admin/pages/{$id}", ['is_active' => true])->assertOk();

        $this->assertNotNull(collect($this->actingAs($this->admin)->getJson('/admin/pages')->json('data'))->firstWhere('id', $id));
    }

    public function test_collectors_is_absent_from_public_and_admin_navigation(): void
    {
        foreach (['/api/v1/navigation', '/api/v1/navigation?locale=en'] as $url) {
            $header = $this->getJson($url)->assertOk()->json('data.header');
            $this->assertNull(collect($header)->firstWhere('href', '/collectors'));
        }

        $admin = $this->actingAs($this->admin)->getJson('/admin/navigation')->assertOk();
        $this->assertNull(collect($admin->json('data.header'))->first(fn ($i) => ($i['page']['slug'] ?? null) === 'collectors'));
        $this->assertNotContains($this->collectors()->id, array_column($admin->json('meta.available_pages'), 'id'));
    }

    public function test_the_other_structural_pages_keep_their_header_links_in_order(): void
    {
        $header = $this->getJson('/api/v1/navigation')->assertOk()->json('data.header');

        $this->assertSame(['/', '/about', '/contact', '/artworks', '/artists', '/exhibitions', '/articles'], array_column($header, 'href'));
    }

    public function test_collectors_url_returns_404_everywhere_public(): void
    {
        $this->getJson('/api/v1/pages/collectors')->assertNotFound();
        $this->getJson('/api/v1/pages/collectors?locale=en')->assertNotFound();
        $this->assertNotContains('collectors', array_column($this->getJson('/api/v1/pages')->json('data'), 'slug'));

        $this->get('/collectors')->assertNotFound();
        $this->get('/sitemap.xml')->assertDontSee('/collectors', false);
    }

    public function test_client_can_reactivate_and_relink_the_page_and_edit_its_content(): void
    {
        $id = $this->collectors()->id;

        $this->actingAs($this->admin)->putJson("/admin/pages/{$id}", [
            'is_active' => true,
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
        $az->assertJsonPath('data.type', 'collectors');
        $az->assertJsonPath('data.content', 'AZ əsas mətn');
        $az->assertJsonPath('data.sections.0.heading', 'Necə almaq olar');
        $this->getJson('/api/v1/pages/collectors?locale=en')->assertOk()->assertJsonPath('data.content', 'EN main text');

        $this->get('/collectors?locale=en')->assertOk()->assertSee('<title>For collectors — ArtNiyyətli</title>', false);

        // Re-linking is an explicit admin action from Admin → Navigation.
        $this->actingAs($this->admin)->postJson('/admin/navigation', ['placement' => 'header', 'nav_type' => 'page', 'page_id' => $id])->assertOk();
        $header = $this->getJson('/api/v1/navigation')->json('data.header');
        $this->assertNotNull(collect($header)->firstWhere('href', '/collectors'));
    }

    public function test_reseeding_does_not_reactivate_or_relink_the_collectors_page_nor_overwrite_client_edits(): void
    {
        $page = $this->collectors();
        $page->translations()->where('locale', 'en')->update(['title' => 'Collectors', 'content' => 'Client copy']);

        $this->seed(PageSeeder::class);

        $this->assertFalse($page->fresh()->is_active);
        $this->assertSame(0, NavigationItem::query()->where('page_id', $page->id)->count());
        $this->assertSame('Client copy', $page->translations()->where('locale', 'en')->value('content'));
        $this->assertSame(1, Page::query()->where('type', 'collectors')->count());
    }

    public function test_migration_unlists_a_previously_live_collectors_page_without_deleting_data(): void
    {
        $page = $this->collectors();
        $page->update(['is_active' => true]);
        NavigationItem::query()->create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null, 'sort_order' => 1, 'is_visible' => true]);
        $section = $page->sections()->create(['key' => 'how-to-buy', 'sort_order' => 0, 'is_active' => true]);
        $about = Page::query()->where('type', 'about')->firstOrFail();
        $aboutNav = NavigationItem::query()->where('page_id', $about->id)->count();

        $this->runUnlistMigration('up');

        $this->assertFalse($page->fresh()->is_active);
        $this->assertSame(0, NavigationItem::query()->where('page_id', $page->id)->count());
        $this->assertSame(2, $page->translations()->count());
        $this->assertNotNull($section->fresh());
        $this->assertTrue($about->fresh()->is_active);
        $this->assertSame($aboutNav, NavigationItem::query()->where('page_id', $about->id)->count());
        $this->getJson('/api/v1/pages/collectors')->assertNotFound();

        // Idempotent, and reversible.
        $this->runUnlistMigration('up');
        $this->runUnlistMigration('down');

        $this->assertTrue($page->fresh()->is_active);
        $this->assertSame(1, NavigationItem::query()->where('page_id', $page->id)->where('placement', 'header')->count());
    }

    private function runUnlistMigration(string $direction): void
    {
        $migration = require database_path('migrations/2026_09_26_000001_unlist_collectors_page.php');
        DB::transaction(fn () => $migration->{$direction}());
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
