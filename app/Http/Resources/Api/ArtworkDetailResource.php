<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use App\Http\Resources\Api\Concerns\ResolvesSeoOverride;
use App\Http\Resources\Api\Concerns\ResolvesYoutubeVideo;
use App\Services\Admin\SiteSettingService;
use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ArtworkDetailResource extends JsonResource
{
    use ResolvesMediaUrl;
    use ResolvesSeoOverride;
    use ResolvesYoutubeVideo;

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
            'video' => $this->videoResource(),
            'seo' => $this->when($this->relationLoaded('seoMetadata'), fn () => $this->seoOverrideBlock($request)),
            'whatsapp_link' => $this->buildWhatsAppLink($card['title']),
        ]);
    }

    private function buildWhatsAppLink(?string $title): ?string
    {
        // Digits only, from the admin setting when it holds a usable number, otherwise from the env config.
        // (An emptied setting is stored as '', which `??` used to treat as "set", hiding the env fallback.)
        $number = SiteSettingService::whatsappDigits(app(SiteSettingService::class)->all()['whatsapp_number'] ?? null);

        if ($number === '') {
            $number = SiteSettingService::whatsappDigits(config('gallery.whatsapp_number'));
        }

        if ($number === '') {
            return null;
        }

        $text = trim(sprintf('Salam, %s (%s) əsəri ilə maraqlanıram.', $title ?? $this->inventory_code, $this->inventory_code));

        return 'https://wa.me/'.$number.'?text='.rawurlencode($text);
    }
}
