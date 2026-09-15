<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class ArtworkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->query('locale', 'az');
        $translation = $this->resolveTranslation($this->translations, $locale);

        return [
            'id' => $this->id,
            'artist' => $this->whenLoaded('artist', fn () => [
                'id' => $this->artist->id,
                'name' => $this->summaryName($this->artist->translations, $locale, fn ($t) => trim($t->first_name.' '.$t->last_name)),
            ]),
            'medium' => $this->whenLoaded('medium', fn () => [
                'id' => $this->medium->id,
                'slug' => $this->medium->slug,
                'name' => $this->summaryName($this->medium->translations, $locale, fn ($t) => $t->name),
            ]),
            'genre' => $this->whenLoaded('genre', fn () => [
                'id' => $this->genre->id,
                'slug' => $this->genre->slug,
                'name' => $this->summaryName($this->genre->translations, $locale, fn ($t) => $t->name),
            ]),
            'year_created' => $this->year_created,
            'width_cm' => (float) $this->width_cm,
            'height_cm' => (float) $this->height_cm,
            'aspect_ratio' => (float) $this->aspect_ratio,
            'price' => (float) $this->price,
            'show_price' => $this->show_price,
            'availability' => $this->availability->value,
            'year_sold' => $this->year_sold,
            'inventory_code' => $this->inventory_code,
            'certificate' => $this->certificate,
            'frame_condition' => $this->frame_condition,
            'delivery_note' => $this->delivery_note,
            'featured' => $this->featured,
            'show_on_wall' => $this->show_on_wall,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'translation' => $translation ? [
                'locale' => $translation->locale->value,
                'slug' => $translation->slug,
                'title' => $translation->title,
                'short_description' => $translation->short_description,
                'provenance' => $translation->provenance,
            ] : null,
            'translations' => $this->when(
                $this->relationLoaded('translations') && $this->translations->pluck('locale')->unique()->count() > 1,
                fn () => $this->translations->map(fn ($t) => [
                    'locale' => $t->locale->value, 'slug' => $t->slug, 'title' => $t->title,
                    'short_description' => $t->short_description, 'provenance' => $t->provenance,
                ])->values()
            ),
            'main_image' => $this->whenLoaded('images', fn () => $this->imageResource($this->images->firstWhere('is_main', true))),
            'images' => $this->whenLoaded('images', fn () => $this->images
                ->sortBy('sort_order')
                ->map(fn ($image) => $this->imageResource($image))
                ->values()),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function resolveTranslation(Collection $translations, string $locale)
    {
        return $translations->first(fn ($t) => $t->locale->value === $locale)
            ?? $translations->first(fn ($t) => $t->locale->value === 'az');
    }

    private function summaryName(Collection $translations, string $locale, \Closure $extract): ?string
    {
        $translation = $this->resolveTranslation($translations, $locale);

        return $translation ? $extract($translation) : null;
    }

    private function imageResource($image): ?array
    {
        if (! $image) {
            return null;
        }

        return [
            'id' => $image->id,
            'media_id' => $image->media_id,
            'type' => $image->type->value,
            'sort_order' => $image->sort_order,
            'is_main' => $image->is_main,
            'media' => $image->relationLoaded('media') ? [
                'id' => $image->media->id,
                'mime_type' => $image->media->mime_type,
                'width' => $image->media->original_width,
                'height' => $image->media->original_height,
                'aspect_ratio' => (float) $image->media->aspect_ratio,
            ] : null,
            'url' => $this->variantUrl($image, 'detail'),
        ];
    }

    private function variantUrl($image, string $preferredSize): ?string
    {
        if (! $image->relationLoaded('media') || ! $image->media->relationLoaded('variants')) {
            return null;
        }

        $variant = $image->media->variants->firstWhere('variant', "{$preferredSize}-webp")
            ?? $image->media->variants->firstWhere('variant', "{$preferredSize}-jpeg");

        return $variant ? Storage::disk($variant->disk)->url($variant->path) : null;
    }
}
