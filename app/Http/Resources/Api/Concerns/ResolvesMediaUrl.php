<?php

namespace App\Http\Resources\Api\Concerns;

use Illuminate\Support\Facades\Storage;

trait ResolvesMediaUrl
{
    private function mediaVariantUrl($media, string $size): ?string
    {
        if (! $media || ! $media->relationLoaded('variants')) {
            return null;
        }

        $variant = $media->variants->firstWhere('variant', "{$size}-webp")
            ?? $media->variants->firstWhere('variant', "{$size}-jpeg");

        return $variant ? Storage::disk($variant->disk)->url($variant->path) : null;
    }
}
