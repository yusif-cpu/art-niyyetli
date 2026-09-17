<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class ArtistResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->query('locale', 'az');
        $translation = $this->resolveTranslation($this->translations, $locale);

        return [
            'id' => $this->id,
            'representation_image_id' => $this->representation_image_id,
            'portrait_url' => $this->whenLoaded('representationImage', fn () => $this->representationImage
                ? $this->variantUrl($this->representationImage, 'detail')
                : null),
            'birth_year' => $this->birth_year,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'translation' => $translation ? [
                'locale' => $translation->locale->value,
                'slug' => $translation->slug,
                'first_name' => $translation->first_name,
                'last_name' => $translation->last_name,
                'birth_place' => $translation->birth_place,
                'direction' => $translation->direction,
                'biography' => $translation->biography,
                'artistic_approach' => $translation->artistic_approach,
            ] : null,
            'translations' => $this->when(
                $this->relationLoaded('translations') && $this->translations->pluck('locale')->unique()->count() > 1,
                fn () => $this->translations->map(fn ($t) => [
                    'locale' => $t->locale->value, 'slug' => $t->slug, 'first_name' => $t->first_name, 'last_name' => $t->last_name,
                    'birth_place' => $t->birth_place, 'direction' => $t->direction,
                    'biography' => $t->biography, 'artistic_approach' => $t->artistic_approach,
                ])->values()
            ),
            'exhibitions' => $this->whenLoaded('exhibitions', fn () => $this->exhibitions
                ->sortBy('sort_order')->values()->map(fn ($e) => [
                    'year' => $e->year,
                    'sort_order' => $e->sort_order,
                    'translations' => $e->translations->map(fn ($t) => [
                        'locale' => $t->locale->value, 'title' => $t->title, 'venue' => $t->venue,
                    ])->values(),
                ])),
            'awards' => $this->whenLoaded('awards', fn () => $this->awards
                ->sortBy('sort_order')->values()->map(fn ($a) => [
                    'year' => $a->year,
                    'sort_order' => $a->sort_order,
                    'translations' => $a->translations->map(fn ($t) => [
                        'locale' => $t->locale->value, 'title' => $t->title,
                    ])->values(),
                ])),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function resolveTranslation(Collection $translations, string $locale)
    {
        return $translations->first(fn ($t) => $t->locale->value === $locale)
            ?? $translations->first(fn ($t) => $t->locale->value === 'az');
    }

    private function variantUrl($media, string $preferredSize): ?string
    {
        if (! $media->relationLoaded('variants')) {
            return null;
        }

        $variant = $media->variants->firstWhere('variant', "{$preferredSize}-webp")
            ?? $media->variants->firstWhere('variant', "{$preferredSize}-jpeg");

        return $variant ? Storage::disk($variant->disk)->url($variant->path) : null;
    }
}
