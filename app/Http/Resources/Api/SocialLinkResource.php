<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SocialLinkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'platform' => $this->platform,
            'url' => $this->url,
            'sort_order' => $this->sort_order,
        ];
    }
}
