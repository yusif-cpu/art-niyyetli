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
            'is_active' => $this->is_active,
        ];
    }
}
