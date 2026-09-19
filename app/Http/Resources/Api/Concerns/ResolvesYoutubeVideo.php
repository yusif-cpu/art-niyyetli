<?php

namespace App\Http\Resources\Api\Concerns;

use App\Support\Youtube;

trait ResolvesYoutubeVideo
{
    private function videoResource(): ?array
    {
        if (! $this->youtube_video_id) {
            return null;
        }

        return [
            'id' => $this->youtube_video_id,
            'embed_url' => Youtube::embedUrl($this->youtube_video_id),
        ];
    }
}
