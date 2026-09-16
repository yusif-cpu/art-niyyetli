<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class PageSectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->query('locale', 'az');
        $translation = $this->resolveTranslation($this->translations, $locale);

        return [
            'id' => $this->id,
            'page_id' => $this->page_id,
            'key' => $this->key,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'image_url' => $this->when($this->relationLoaded('image'), fn () => $this->image ? $this->variantUrl($this->image, 'detail') : null),
            'media_id' => $this->media_id,
            'translation' => $translation ? [
                'locale' => $translation->locale->value,
                'heading' => $translation->heading,
                'body' => $translation->body,
            ] : null,
            'translations' => $this->when(
                $this->relationLoaded('translations') && $this->translations->pluck('locale')->unique()->count() > 1,
                fn () => $this->translations->map(fn ($t) => [
                    'locale' => $t->locale->value, 'heading' => $t->heading, 'body' => $t->body,
                ])->values()
            ),
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
