<?php

namespace App\Http\Requests\Admin\Concerns;

use App\Enums\LogoDisplayMode;
use App\Enums\MediaType;
use App\Models\SocialLink;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\Validator;

trait ValidatesSocialLinkPayload
{
    protected function logoMediaExistsRule(): Exists
    {
        return Rule::exists('media', 'id')
            ->where('type', MediaType::Image->value)
            ->whereNull('deleted_at');
    }

    protected function rejectDangerousUrlScheme(Validator $validator): void
    {
        $url = $this->input('url');

        if (! is_string($url) || $url === '') {
            return;
        }

        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        if (! in_array($scheme, ['http', 'https'], true)) {
            $validator->errors()->add('url', 'Only http/https links are allowed.');
        }
    }

    /**
     * "Logo only" renders nothing but the image, so it needs one. Partial
     * updates are judged against the values the link already has.
     */
    protected function requireLogoForLogoOnlyMode(Validator $validator, ?SocialLink $existing = null): void
    {
        $mode = $this->has('display_mode') ? $this->input('display_mode') : $existing?->display_mode?->value;
        $logoId = $this->has('logo_media_id') ? $this->input('logo_media_id') : $existing?->logo_media_id;

        if ($mode === LogoDisplayMode::LogoOnly->value && ! $logoId) {
            $validator->errors()->add('logo_media_id', 'A logo is required when the display mode is logo only.');
        }
    }
}
