<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class MediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->query('locale', 'az');

        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'width' => $this->original_width,
            'height' => $this->original_height,
            'aspect_ratio' => (float) $this->aspect_ratio,
            'alt_text' => $this->resolveAltText($locale),
            'translations' => $this->whenLoaded('translations', fn () => $this->translations->mapWithKeys(
                fn ($t) => [$t->locale->value => $t->alt_text]
            )),
            'variants' => $this->whenLoaded('variants', fn () => $this->variants->map(fn ($variant) => [
                'variant' => $variant->variant,
                'width' => $variant->width,
                'height' => $variant->height,
                'mime_type' => $variant->mime_type,
                'size_bytes' => $variant->size_bytes,
                'url' => Storage::disk($variant->disk)->url($variant->path),
            ])->values()),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function resolveAltText(string $locale): ?string
    {
        if (! $this->relationLoaded('translations')) {
            return null;
        }

        $translation = $this->translations->first(fn ($t) => $t->locale->value === $locale)
            ?? $this->translations->first(fn ($t) => $t->locale->value === 'az');

        return $translation?->alt_text;
    }
}
