<?php

namespace App\Http\Resources\Admin\Concerns;

use Illuminate\Support\Facades\Storage;

trait SerializesSeoOverrides
{
    /** The stored SEO override rows, one per locale. Requires `seoMetadata.ogImage.variants` to be loaded. */
    private function seoOverrides(): array
    {
        return $this->seoMetadata->map(fn ($row) => [
            'locale' => $row->locale->value,
            'title' => $row->title,
            'description' => $row->description,
            'og_image_id' => $row->og_image_id,
            'og_image_url' => $this->seoImageUrl($row->ogImage),
        ])->values()->all();
    }

    private function seoImageUrl($media): ?string
    {
        if (! $media || ! $media->relationLoaded('variants')) {
            return null;
        }

        $variant = $media->variants->firstWhere('variant', 'detail-webp')
            ?? $media->variants->firstWhere('variant', 'detail-jpeg');

        return $variant ? Storage::disk($variant->disk)->url($variant->path) : null;
    }
}
