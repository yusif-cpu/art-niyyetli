<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PageSectionResource extends JsonResource
{
    use ResolvesMediaUrl;

    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, ['heading', 'body']);

        return [
            'key' => $this->key,
            'heading' => $fields['heading'],
            'body' => $fields['body'],
            'sort_order' => $this->sort_order,
            'image_url' => $this->when(
                $this->relationLoaded('image'),
                fn () => $this->image ? $this->mediaVariantUrl($this->image, 'detail') : null
            ),
        ];
    }
}
