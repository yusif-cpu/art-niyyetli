<?php

namespace App\Http\Resources\Api\Concerns;

use App\Support\Api\LocaleResolver;
use Illuminate\Http\Request;

/**
 * The admin-set SEO override of a detail response, for the request locale only (no fallback to another locale, the
 * same rule the server-rendered <head> applies). Requires `seoMetadata.ogImage.variants` to be eager-loaded and the ResolvesMediaUrl trait on the resource.
 */
trait ResolvesSeoOverride
{
    private function seoOverrideBlock(Request $request): ?array
    {
        $override = $this->seoOverride(LocaleResolver::resolve($request));

        if (! $override) {
            return null;
        }

        $block = [
            'title' => $override->title,
            'description' => $override->description,
            'image_url' => $override->ogImage ? $this->mediaVariantUrl($override->ogImage, 'detail') : null,
        ];

        return array_filter($block, fn ($value) => $value !== null) ? $block : null;
    }
}
