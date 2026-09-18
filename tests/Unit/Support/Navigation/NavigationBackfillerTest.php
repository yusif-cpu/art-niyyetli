<?php

namespace Tests\Unit\Support\Navigation;

use App\Support\Navigation\NavigationBackfiller;
use PHPUnit\Framework\TestCase;

class NavigationBackfillerTest extends TestCase
{
    private function page(int $id, string $navPlacement, int $sortOrder, ?string $deletedAt = null): object
    {
        return (object) ['id' => $id, 'nav_placement' => $navPlacement, 'sort_order' => $sortOrder, 'deleted_at' => $deletedAt];
    }

    public function test_returns_only_the_four_header_routes_when_there_are_no_pages(): void
    {
        $rows = NavigationBackfiller::buildRows([]);

        $this->assertSame([
            ['placement' => 'header', 'nav_type' => 'route', 'page_id' => null, 'route_key' => 'artworks', 'sort_order' => 0, 'is_visible' => true],
            ['placement' => 'header', 'nav_type' => 'route', 'page_id' => null, 'route_key' => 'artists', 'sort_order' => 1, 'is_visible' => true],
            ['placement' => 'header', 'nav_type' => 'route', 'page_id' => null, 'route_key' => 'exhibitions', 'sort_order' => 2, 'is_visible' => true],
            ['placement' => 'header', 'nav_type' => 'route', 'page_id' => null, 'route_key' => 'articles', 'sort_order' => 3, 'is_visible' => true],
        ], $rows);
    }

    public function test_orders_header_pages_by_sort_order_then_id_and_appends_routes_after_them(): void
    {
        $rows = NavigationBackfiller::buildRows([
            $this->page(id: 2, navPlacement: 'header', sortOrder: 1),
            $this->page(id: 1, navPlacement: 'header', sortOrder: 0),
        ]);

        $pageRows = array_values(array_filter($rows, fn ($r) => $r['nav_type'] === 'page'));
        $routeRows = array_values(array_filter($rows, fn ($r) => $r['nav_type'] === 'route'));

        $this->assertSame([1, 2], array_column($pageRows, 'page_id'));
        $this->assertSame([0, 1], array_column($pageRows, 'sort_order'));
        $this->assertSame([2, 3, 4, 5], array_column($routeRows, 'sort_order'));
    }

    public function test_orders_ties_by_id_when_sort_order_is_equal(): void
    {
        $rows = NavigationBackfiller::buildRows([
            $this->page(id: 5, navPlacement: 'header', sortOrder: 0),
            $this->page(id: 3, navPlacement: 'header', sortOrder: 0),
        ]);

        $pageRows = array_values(array_filter($rows, fn ($r) => $r['nav_type'] === 'page'));

        $this->assertSame([3, 5], array_column($pageRows, 'page_id'));
    }

    public function test_footer_pages_are_ordered_independently_and_get_no_route_items(): void
    {
        $rows = NavigationBackfiller::buildRows([
            $this->page(id: 10, navPlacement: 'footer', sortOrder: 1),
            $this->page(id: 11, navPlacement: 'footer', sortOrder: 0),
        ]);

        $footerRows = array_values(array_filter($rows, fn ($r) => $r['placement'] === 'footer'));

        $this->assertCount(2, $footerRows);
        $this->assertSame([11, 10], array_column($footerRows, 'page_id'));
        $this->assertSame([0, 1], array_column($footerRows, 'sort_order'));
        $this->assertTrue(collect($footerRows)->every(fn ($r) => $r['nav_type'] === 'page'));
    }

    public function test_a_page_with_nav_placement_none_is_excluded(): void
    {
        $rows = NavigationBackfiller::buildRows([
            $this->page(id: 1, navPlacement: 'none', sortOrder: 0),
        ]);

        $this->assertEmpty(array_filter($rows, fn ($r) => $r['nav_type'] === 'page'));
    }

    public function test_a_soft_deleted_page_is_excluded_even_if_it_had_a_nav_placement(): void
    {
        $rows = NavigationBackfiller::buildRows([
            $this->page(id: 1, navPlacement: 'header', sortOrder: 0, deletedAt: '2026-01-01 00:00:00'),
        ]);

        $this->assertEmpty(array_filter($rows, fn ($r) => $r['nav_type'] === 'page'));
    }
}
