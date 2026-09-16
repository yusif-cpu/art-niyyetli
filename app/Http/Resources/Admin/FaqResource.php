<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

class FaqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->query('locale', 'az');
        $translation = $this->resolveTranslation($this->translations, $locale);

        return [
            'id' => $this->id,
            'page_id' => $this->page_id,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'translation' => $translation ? [
                'locale' => $translation->locale->value,
                'question' => $translation->question,
                'answer' => $translation->answer,
            ] : null,
            'translations' => $this->when(
                $this->relationLoaded('translations') && $this->translations->pluck('locale')->unique()->count() > 1,
                fn () => $this->translations->map(fn ($t) => [
                    'locale' => $t->locale->value, 'question' => $t->question, 'answer' => $t->answer,
                ])->values()
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
