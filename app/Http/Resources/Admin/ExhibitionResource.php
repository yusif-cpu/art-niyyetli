<?php

namespace App\Http\Resources\Admin;

use App\Support\Youtube;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class ExhibitionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->query('locale', 'az');
        $translation = $this->resolveTranslation($this->translations, $locale);

        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'is_active' => $this->is_active,
            'translation' => $translation ? [
                'locale' => $translation->locale->value,
                'slug' => $translation->slug,
                'title' => $translation->title,
                'venue' => $translation->venue,
                'short_text' => $translation->short_text,
                'full_text' => $translation->full_text,
            ] : null,
            'translations' => $this->when(
                $this->relationLoaded('translations') && $this->translations->pluck('locale')->unique()->count() > 1,
                fn () => $this->translations->map(fn ($t) => [
                    'locale' => $t->locale->value, 'slug' => $t->slug, 'title' => $t->title,
                    'venue' => $t->venue, 'short_text' => $t->short_text, 'full_text' => $t->full_text,
                ])->values()
            ),
            'artists' => $this->whenLoaded('artists', fn () => $this->artists
                ->sortBy(fn ($artist) => $artist->pivot->sort_order)
                ->map(fn ($artist) => [
                    'id' => $artist->id,
                    'sort_order' => $artist->pivot->sort_order,
                    'name' => $this->summaryName($artist->translations, $locale, fn ($t) => trim($t->first_name.' '.$t->last_name)),
                ])->values()),
            'artworks' => $this->whenLoaded('artworks', fn () => $this->artworks
                ->sortBy(fn ($artwork) => $artwork->pivot->sort_order)
                ->map(fn ($artwork) => [
                    'id' => $artwork->id,
                    'sort_order' => $artwork->pivot->sort_order,
                    'title' => $this->summaryName($artwork->translations, $locale, fn ($t) => $t->title),
                    'inventory_code' => $artwork->inventory_code,
                ])->values()),
            'media' => $this->whenLoaded('media', fn () => $this->media
                ->sortBy('sort_order')
                ->map(fn ($item) => $this->mediaResource($item))
                ->values()),
            'youtube_video_id' => $this->youtube_video_id,
            'youtube_url' => $this->youtube_video_id ? Youtube::watchUrl($this->youtube_video_id) : null,
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

    private function mediaResource($item): array
    {
        return [
            'id' => $item->id,
            'media_id' => $item->media_id,
            'type' => $item->type->value,
            'sort_order' => $item->sort_order,
            'media' => $item->relationLoaded('media') ? [
                'id' => $item->media->id,
                'mime_type' => $item->media->mime_type,
                'width' => $item->media->original_width,
                'height' => $item->media->original_height,
            ] : null,
            'url' => $this->variantUrl($item, 'detail'),
        ];
    }

    private function variantUrl($item, string $preferredSize): ?string
    {
        if (! $item->relationLoaded('media') || ! $item->media->relationLoaded('variants')) {
            return null;
        }

        $variant = $item->media->variants->firstWhere('variant', "{$preferredSize}-webp")
            ?? $item->media->variants->firstWhere('variant', "{$preferredSize}-jpeg");

        return $variant ? Storage::disk($variant->disk)->url($variant->path) : null;
    }
}
