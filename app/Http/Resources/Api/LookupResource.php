<?php

namespace App\Http\Resources\Api;

use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A slug + localized name pair, shared by the genre and medium lists (the same shape the artwork cards embed).
 */
class LookupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $fields = LocalizedFields::resolve($this->translations, LocaleResolver::resolve($request), ['name']);

        return [
            'slug' => $this->slug,
            'name' => $fields['name'],
            'sort_order' => $this->sort_order,
        ];
    }
}
