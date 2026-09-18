<?php

namespace App\Http\Resources\Api;

use App\Enums\NavType;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NavigationItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if ($this->nav_type === NavType::Page) {
            $locale = LocaleResolver::resolve($request);
            $fields = LocalizedFields::resolve($this->page->translations, $locale, ['slug', 'title']);

            return [
                'type' => 'page',
                'title' => $fields['title'],
                'href' => $this->page->type->value === 'home' ? '/' : "/{$fields['slug']}",
            ];
        }

        return [
            'type' => 'route',
            'route_key' => $this->route_key->value,
            'href' => $this->route_key->href(),
        ];
    }
}
