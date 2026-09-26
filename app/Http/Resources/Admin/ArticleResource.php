<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\Admin\Concerns\SerializesSeoOverrides;
use App\Support\Youtube;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class ArticleResource extends JsonResource
{
    use SerializesSeoOverrides;

    public function toArray(Request $request): array
    {
        $locale = $request->query('locale', 'az');
        $translation = $this->resolveTranslation($this->translations, $locale);

        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'published_at' => $this->published_at?->toIso8601String(),
            'is_active' => $this->is_active,
            'youtube_video_id' => $this->youtube_video_id,
            'youtube_url' => $this->youtube_video_id ? Youtube::watchUrl($this->youtube_video_id) : null,
            'translation' => $translation ? [
                'locale' => $translation->locale->value,
                'slug' => $translation->slug,
                'title' => $translation->title,
                'short_text' => $translation->short_text,
                'content' => $translation->content,
            ] : null,
            'translations' => $this->when(
                $this->relationLoaded('translations') && $this->translations->pluck('locale')->unique()->count() > 1,
                fn () => $this->translations->map(fn ($t) => [
                    'locale' => $t->locale->value, 'slug' => $t->slug, 'title' => $t->title,
                    'short_text' => $t->short_text, 'content' => $t->content,
                ])->values()
            ),
            'media' => $this->whenLoaded('media', fn () => $this->media
                ->sortBy(fn ($item) => $item->pivot->sort_order)
                ->map(fn ($item) => $this->mediaResource($item))
                ->values()),
            'seo' => $this->when($this->relationLoaded('seoMetadata'), fn () => $this->seoOverrides()),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function resolveTranslation(Collection $translations, string $locale)
    {
        return $translations->first(fn ($t) => $t->locale->value === $locale)
            ?? $translations->first(fn ($t) => $t->locale->value === 'az');
    }

    private function mediaResource($media): array
    {
        return [
            'id' => $media->id,
            'sort_order' => $media->pivot->sort_order,
            'type' => $media->type->value,
            'url' => $this->variantUrl($media, 'detail'),
            'mime_type' => $media->mime_type,
            'width' => $media->original_width,
            'height' => $media->original_height,
        ];
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
