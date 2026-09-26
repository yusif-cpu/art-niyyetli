<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediumResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->query('locale', 'az');
        $translation = $this->translations->first(fn ($t) => $t->locale->value === $locale)
            ?? $this->translations->first(fn ($t) => $t->locale->value === 'az');

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $translation?->name,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'translations' => $this->translations->map(fn ($t) => [
                'locale' => $t->locale->value, 'name' => $t->name,
            ])->values(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
