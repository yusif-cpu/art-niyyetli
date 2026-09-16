<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExhibitionResource extends JsonResource
{
    use ResolvesMediaUrl;

    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, ['slug', 'title', 'venue', 'short_text', 'full_text']);

        return [
            'slug' => $fields['slug'],
            'title' => $fields['title'],
            'type' => $this->type->value,
            'status' => $this->status->value,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'venue' => $fields['venue'],
            'short_text' => $fields['short_text'],
            'full_text' => $fields['full_text'],
            'artists' => $this->whenLoaded('artists', function () use ($locale) {
                return $this->artists->sortBy(fn ($a) => $a->pivot->sort_order)->values()->map(function ($artist) use ($locale) {
                    $f = LocalizedFields::resolve($artist->translations, $locale, ['slug', 'first_name', 'last_name']);

                    return [
                        'id' => $artist->id,
                        'slug' => $f['slug'],
                        'name' => trim(($f['first_name'] ?? '').' '.($f['last_name'] ?? '')),
                    ];
                });
            }),
            'artworks' => $this->whenLoaded('artworks', fn () => ArtworkCardResource::collection(
                $this->artworks->where('is_active', true)->sortBy(fn ($a) => $a->pivot->sort_order)->values()
            )),
            'media' => $this->whenLoaded('media', fn () => $this->media->sortBy('sort_order')->values()->map(fn ($item) => [
                'type' => $item->type->value,
                'url' => $this->mediaVariantUrl($item->media, 'detail'),
            ])),
        ];
    }
}
