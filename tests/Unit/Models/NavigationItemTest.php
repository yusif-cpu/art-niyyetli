<?php

namespace Tests\Unit\Models;

use App\Models\NavigationItem;
use App\Models\Page;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Tests\TestCase;

class NavigationItemTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_page_item_without_a_page_id_is_rejected(): void
    {
        $this->expectException(LogicException::class);

        NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => null, 'route_key' => null]);
    }

    public function test_a_page_item_with_a_route_key_is_rejected(): void
    {
        $page = Page::factory()->create();

        $this->expectException(LogicException::class);

        NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => 'artworks']);
    }

    public function test_a_route_item_without_a_route_key_is_rejected(): void
    {
        $this->expectException(LogicException::class);

        NavigationItem::create(['placement' => 'header', 'nav_type' => 'route', 'page_id' => null, 'route_key' => null]);
    }

    public function test_a_route_item_with_a_page_id_is_rejected(): void
    {
        $page = Page::factory()->create();

        $this->expectException(LogicException::class);

        NavigationItem::create(['placement' => 'header', 'nav_type' => 'route', 'page_id' => $page->id, 'route_key' => 'artworks']);
    }

    public function test_a_valid_page_item_can_be_created(): void
    {
        $page = Page::factory()->create();

        $item = NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null]);

        $this->assertSame($page->id, $item->page_id);
    }

    public function test_a_valid_route_item_can_be_created(): void
    {
        $item = NavigationItem::create(['placement' => 'footer', 'nav_type' => 'route', 'page_id' => null, 'route_key' => 'artworks']);

        $this->assertSame('artworks', $item->route_key->value);
    }

    public function test_the_same_page_cannot_be_added_twice_to_the_same_placement(): void
    {
        $page = Page::factory()->create();
        NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null]);

        $this->expectException(QueryException::class);
        NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null]);
    }

    public function test_the_same_page_can_be_added_to_both_header_and_footer(): void
    {
        $page = Page::factory()->create();
        NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null]);
        $item = NavigationItem::create(['placement' => 'footer', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null]);

        $this->assertSame('footer', $item->placement->value);
    }

    public function test_the_same_route_cannot_be_added_twice_to_the_same_placement(): void
    {
        // The backfill migration itself seeds (header, artworks) on every fresh
        // install (see NavigationBackfiller), so it already exists here.
        $this->expectException(QueryException::class);
        NavigationItem::create(['placement' => 'header', 'nav_type' => 'route', 'page_id' => null, 'route_key' => 'artworks']);
    }

    public function test_deleting_a_page_deletes_its_navigation_items_via_the_cascading_foreign_key(): void
    {
        $page = Page::factory()->create();
        $item = NavigationItem::create(['placement' => 'header', 'nav_type' => 'page', 'page_id' => $page->id, 'route_key' => null]);

        $page->forceDelete();

        $this->assertDatabaseMissing('navigation_items', ['id' => $item->id]);
    }
}
