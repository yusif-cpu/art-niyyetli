<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ArtworkCardResource extends JsonResource
{
    use ResolvesMediaUrl;

    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, ['title']);
        $mainImage = $this->relationLoaded('images') ? $this->images->firstWhere('is_main', true) : null;

        return [
            'inventory_code' => $this->inventory_code,
            'title' => $fields['title'],
            'artist' => $this->whenLoaded('artist', function () use ($locale) {
                $f = LocalizedFields::resolve($this->artist->translations, $locale, ['first_name', 'last_name']);

                return [
                    'id' => $this->artist->id,
                    'name' => trim(($f['first_name'] ?? '').' '.($f['last_name'] ?? '')),
                ];
            }),
            'image_url' => $mainImage ? $this->mediaVariantUrl($mainImage->media, 'catalogue') : null,
            'genre' => $this->whenLoaded('genre', function () use ($locale) {
                $f = LocalizedFields::resolve($this->genre->translations, $locale, ['name']);

                return ['slug' => $this->genre->slug, 'name' => $f['name']];
            }),
            'medium' => $this->whenLoaded('medium', function () use ($locale) {
                $f = LocalizedFields::resolve($this->medium->translations, $locale, ['name']);

                return ['slug' => $this->medium->slug, 'name' => $f['name']];
            }),
            'price' => $this->show_price ? (float) $this->price : null,
            'currency' => $this->show_price ? config('gallery.currency') : null,
            'availability' => $this->availability->value,
            'width_cm' => (float) $this->width_cm,
            'height_cm' => (float) $this->height_cm,
        ];
    }
}
