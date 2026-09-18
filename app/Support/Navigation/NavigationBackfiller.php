<?php

namespace App\Support\Navigation;

use App\Enums\NavRouteKey;
use App\Enums\NavType;
use Illuminate\Support\Collection;

/**
 * Pure transformation from legacy `pages.nav_placement`/`sort_order` rows into
 * `navigation_items` rows, used by the one-time backfill migration. Kept free of
 * any DB access so the exact ordering/inclusion rules can be unit tested without
 * fighting Laravel's schema-per-test-run limitations (see
 * tests/Unit/Support/Navigation/NavigationBackfillerTest.php).
 */
class NavigationBackfiller
{
    /**
     * The 4 special routes have always rendered in the header today, in this
     * fixed order, via Header.jsx's hardcoded CATALOGUE_ITEMS array. The footer
     * has never rendered any of them, so none are appended there.
     */
    private const HEADER_ROUTES = [
        NavRouteKey::Artworks,
        NavRouteKey::Artists,
        NavRouteKey::Exhibitions,
        NavRouteKey::Articles,
    ];

    /**
     * @param  iterable<object{id:int,nav_placement:string,sort_order:int,deleted_at:?string}>  $pages
     * @return array<int, array{placement:string,nav_type:string,page_id:?int,route_key:?string,sort_order:int,is_visible:bool}>
     */
    public static function buildRows(iterable $pages): array
    {
        $eligible = collect($pages)->filter(fn ($page) => $page->deleted_at === null);

        $rows = [];

        foreach (['header', 'footer'] as $placement) {
            $position = 0;

            foreach (self::orderedPagesFor($eligible, $placement) as $page) {
                $rows[] = self::pageRow($placement, $page->id, $position++);
            }

            if ($placement === 'header') {
                foreach (self::HEADER_ROUTES as $routeKey) {
                    $rows[] = self::routeRow($placement, $routeKey, $position++);
                }
            }
        }

        return $rows;
    }

    private static function orderedPagesFor(Collection $pages, string $placement): Collection
    {
        return $pages
            ->filter(fn ($page) => $page->nav_placement === $placement)
            ->sortBy([['sort_order', 'asc'], ['id', 'asc']])
            ->values();
    }

    private static function pageRow(string $placement, int $pageId, int $sortOrder): array
    {
        return [
            'placement' => $placement,
            'nav_type' => NavType::Page->value,
            'page_id' => $pageId,
            'route_key' => null,
            'sort_order' => $sortOrder,
            'is_visible' => true,
        ];
    }

    private static function routeRow(string $placement, NavRouteKey $routeKey, int $sortOrder): array
    {
        return [
            'placement' => $placement,
            'nav_type' => NavType::Route->value,
            'page_id' => null,
            'route_key' => $routeKey->value,
            'sort_order' => $sortOrder,
            'is_visible' => true,
        ];
    }
}
