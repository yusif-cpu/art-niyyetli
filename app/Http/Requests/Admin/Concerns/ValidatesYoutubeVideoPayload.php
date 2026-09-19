<?php

namespace App\Http\Requests\Admin\Concerns;

use App\Support\Youtube;
use Illuminate\Validation\Validator;

trait ValidatesYoutubeVideoPayload
{
    protected function deriveYoutubeVideoId(): void
    {
        if (! $this->has('youtube_url')) {
            return;
        }

        $url = trim((string) $this->input('youtube_url'));

        $this->merge(['youtube_video_id' => $url === '' ? null : Youtube::extractVideoId($url)]);
    }

    protected function rejectInvalidYoutubeUrl(Validator $validator): void
    {
        $url = $this->input('youtube_url');

        if (! is_string($url) || trim($url) === '') {
            return;
        }

        if (Youtube::extractVideoId($url) === null) {
            $validator->errors()->add('youtube_url', 'Zəhmət olmasa etibarlı YouTube video linki daxil edin.');
        }
    }
}
