<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Http\Resources\Api\Concerns\ResolvesSeoOverride;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PageResource extends JsonResource
{
    use ResolvesMediaUrl;
    use ResolvesSeoOverride;

    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, ['slug', 'title', 'content']);

        return [
            'slug' => $fields['slug'],
            'type' => $this->type->value,
            'title' => $fields['title'],
            'content' => $fields['content'],
            'seo' => $this->when($this->relationLoaded('seoMetadata'), fn () => $this->seoOverrideBlock($request)),
            'sections' => $this->when(
                $this->relationLoaded('sections'),
                fn () => PageSectionResource::collection($this->sections->sortBy('sort_order')->values())
            ),
        ];
    }
}
