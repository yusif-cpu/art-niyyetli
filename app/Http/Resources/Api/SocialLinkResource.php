<?php

namespace App\Http\Resources\Api;

use App\Http\Resources\Api\Concerns\ResolvesMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SocialLinkResource extends JsonResource
{
    use ResolvesMediaUrl;

    public function toArray(Request $request): array
    {
        return [
            'platform' => $this->platform,
            'url' => $this->url,
            'display_mode' => $this->display_mode->value,
            'logo_url' => $this->mediaVariantUrl($this->logoMedia, 'thumbnail'),
            'sort_order' => $this->sort_order,
        ];
    }
}
