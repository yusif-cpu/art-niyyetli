<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

class PageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->query('locale', 'az');
        $translation = $this->resolveTranslation($this->translations, $locale);

        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'is_active' => $this->is_active,
            'translation' => $translation ? [
                'locale' => $translation->locale->value,
                'slug' => $translation->slug,
                'title' => $translation->title,
                'content' => $translation->content,
            ] : null,
            'translations' => $this->when(
                $this->relationLoaded('translations') && $this->translations->pluck('locale')->unique()->count() > 1,
                fn () => $this->translations->map(fn ($t) => [
                    'locale' => $t->locale->value, 'slug' => $t->slug, 'title' => $t->title, 'content' => $t->content,
                ])->values()
            ),
            'sections' => $this->when(
                $this->relationLoaded('sections'),
                fn () => PageSectionResource::collection($this->sections->sortBy('sort_order')->values())
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function resolveTranslation(Collection $translations, string $locale)
    {
        return $translations->first(fn ($t) => $t->locale->value === $locale)
            ?? $translations->first(fn ($t) => $t->locale->value === 'az');
    }
}
