<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Http\Resources\Api\Concerns\ResolvesSeoOverride;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ArtistResource extends JsonResource
{
    use ResolvesMediaUrl;
    use ResolvesSeoOverride;

    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, [
            'slug', 'first_name', 'last_name', 'birth_place', 'direction', 'biography', 'artistic_approach',
        ]);

        return [
            'id' => $this->id,
            'slug' => $fields['slug'],
            'first_name' => $fields['first_name'],
            'last_name' => $fields['last_name'],
            'birth_year' => $this->birth_year,
            'birth_place' => $fields['birth_place'],
            'direction' => $fields['direction'],
            'biography' => $fields['biography'],
            'artistic_approach' => $fields['artistic_approach'],
            'portrait_url' => $this->when(
                $this->relationLoaded('representationImage'),
                fn () => $this->representationImage ? $this->mediaVariantUrl($this->representationImage, 'detail') : null
            ),
            'exhibitions' => $this->when($this->relationLoaded('exhibitions'), function () use ($locale) {
                return $this->exhibitions->sortBy('sort_order')->values()->map(function ($exhibition) use ($locale) {
                    $f = LocalizedFields::resolve($exhibition->translations, $locale, ['title', 'venue']);

                    return ['year' => $exhibition->year, 'title' => $f['title'], 'venue' => $f['venue']];
                });
            }),
            'awards' => $this->when($this->relationLoaded('awards'), function () use ($locale) {
                return $this->awards->sortBy('sort_order')->values()->map(function ($award) use ($locale) {
                    $f = LocalizedFields::resolve($award->translations, $locale, ['title']);

                    return ['year' => $award->year, 'title' => $f['title']];
                });
            }),
            'seo' => $this->when($this->relationLoaded('seoMetadata'), fn () => $this->seoOverrideBlock($request)),
            'artworks' => $this->when(
                $this->relationLoaded('artworks'),
                fn () => ArtworkCardResource::collection($this->artworks->where('is_active', true)->values())
            ),
        ];
    }
}
