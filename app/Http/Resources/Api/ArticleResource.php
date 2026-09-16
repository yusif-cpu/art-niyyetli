<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ArticleResource extends JsonResource
{
    use ResolvesMediaUrl;

    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, ['slug', 'title', 'short_text', 'content']);

        return [
            'slug' => $fields['slug'],
            'title' => $fields['title'],
            'type' => $this->type->value,
            'short_text' => $fields['short_text'],
            'content' => $fields['content'],
            'published_at' => $this->published_at?->toIso8601String(),
            'media' => $this->whenLoaded('media', fn () => $this->media
                ->sortBy(fn ($m) => $m->pivot->sort_order)
                ->values()
                ->map(fn ($item) => [
                    'type' => $item->type->value,
                    'url' => $this->mediaVariantUrl($item, 'detail'),
                ])),
        ];
    }
}
