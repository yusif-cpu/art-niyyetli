<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SocialLinkResource extends JsonResource
{
    use ResolvesMediaUrl;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'platform' => $this->platform,
            'url' => $this->url,
            'logo_media_id' => $this->logo_media_id,
            'logo_url' => $this->whenLoaded('logoMedia', fn () => $this->mediaVariantUrl($this->logoMedia, 'thumbnail')),
            'display_mode' => $this->display_mode->value,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
