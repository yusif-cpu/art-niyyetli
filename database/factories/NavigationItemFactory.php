<?php

namespace Database\Factories;

use App\Enums\NavPlacement;
use App\Enums\NavRouteKey;
use App\Enums\NavType;
use App\Models\NavigationItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NavigationItem>
 */
class NavigationItemFactory extends Factory
{
    protected $model = NavigationItem::class;

    public function definition(): array
    {
        return [
            'placement' => NavPlacement::Header->value,
            'nav_type' => NavType::Route->value,
            'page_id' => null,
            'route_key' => NavRouteKey::Artworks->value,
            'sort_order' => 0,
            'is_visible' => true,
        ];
    }

    public function forPage(int $pageId): static
    {
        return $this->state([
            'nav_type' => NavType::Page->value,
            'page_id' => $pageId,
            'route_key' => null,
        ]);
    }
}
