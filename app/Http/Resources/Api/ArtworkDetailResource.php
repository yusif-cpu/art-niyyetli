<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Services\Admin\SiteSettingService;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ArtworkDetailResource extends JsonResource
{
    use ResolvesMediaUrl;

    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $card = (new ArtworkCardResource($this->resource))->toArray($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, ['short_description', 'provenance']);

        return array_merge($card, [
            'year_created' => $this->year_created,
            'short_description' => $fields['short_description'],
            'provenance' => $fields['provenance'],
            'certificate' => $this->certificate,
            'frame_condition' => $this->frame_condition,
            'delivery_note' => $this->delivery_note,
            'images' => $this->whenLoaded('images', fn () => $this->images->sortBy('sort_order')->values()->map(fn ($image) => [
                'type' => $image->type->value,
                'sort_order' => $image->sort_order,
                'is_main' => $image->is_main,
                'url' => $this->mediaVariantUrl($image->media, 'full'),
            ])),
            'similar' => $this->when(
                $this->relationLoaded('similar'),
                fn () => ArtworkCardResource::collection($this->similar)
            ),
            'whatsapp_link' => $this->buildWhatsAppLink($card['title']),
        ]);
    }

    private function buildWhatsAppLink(?string $title): ?string
    {
        $number = app(SiteSettingService::class)->all()['whatsapp_number'] ?? config('gallery.whatsapp_number');
        if (! $number) {
            return null;
        }

        $text = trim(sprintf('Salam, %s (%s) əsəri ilə maraqlanıram.', $title ?? $this->inventory_code, $this->inventory_code));

        return 'https://wa.me/'.$number.'?text='.rawurlencode($text);
    }
}
