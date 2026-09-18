<?php

namespace App\Http\Resources\Admin;

use App\Enums\NavType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NavigationItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'placement' => $this->placement->value,
            'nav_type' => $this->nav_type->value,
            'is_visible' => $this->is_visible,
            'sort_order' => $this->sort_order,
            'page' => $this->when($this->nav_type === NavType::Page, function () {
                $translation = $this->page->translations->firstWhere('locale', 'az')
                    ?? $this->page->translations->first();

                return [
                    'id' => $this->page->id,
                    'title' => $translation?->title,
                    'slug' => $translation?->slug,
                    'is_active' => $this->page->is_active,
                ];
            }),
            'route_key' => $this->when($this->nav_type === NavType::Route, fn () => $this->route_key->value),
        ];
    }
}
